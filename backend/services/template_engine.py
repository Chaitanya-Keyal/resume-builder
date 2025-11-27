from typing import List

from ..models.sections import (
    AwardsSection,
    CustomSection,
    EducationSection,
    ExperienceSection,
    PersonalInfo,
    ProjectsSection,
    ResumeData,
    SkillsSection,
)
from .escape_latex import escape_latex, escape_url


def generate_latex(data: ResumeData) -> str:
    contact_items: List[str] = []

    if data.heading.phone:
        contact_items.append(escape_latex(data.heading.phone))

    if data.heading.email:
        email = escape_latex(data.heading.email)
        contact_items.append(f"\\href{{mailto:{email}}}{{\\textbf{{{email}}}}}")

    for social in data.heading.socials:
        if social.url:
            url = escape_url(social.url)
            name = escape_latex(social.name)
            contact_items.append(f"\\href{{{url}}}{{\\textbf{{{name}}}}}")

    contact_line = f"\\small {' $|$ '.join(contact_items)}" if contact_items else ""

    section_content = []
    for section_key in data.section_order:
        content = _generate_section(section_key, data)
        if content:
            section_content.append(content)

    section_latex = "\n".join(section_content)

    return _build_document(data.heading, contact_line, section_latex)


def _generate_section(section_key: str, data: ResumeData) -> str:
    if section_key == "education":
        return _generate_education(data.education)
    elif section_key == "skills":
        return _generate_skills(data.skills)
    elif section_key == "experience":
        return _generate_experience(data.experience)
    elif section_key == "projects":
        return _generate_projects(data.projects)
    elif section_key == "honors_and_awards":
        return _generate_awards(data.honors_and_awards)
    else:
        for custom in data.custom_sections:
            if custom.section_type == section_key:
                return _generate_custom_section(custom)

    return ""


def _generate_education(education: EducationSection) -> str:
    if not education.entries:
        return ""

    entries_latex = []
    for edu in education.entries:
        marks_str = f"; {escape_latex(edu.marks)}" if edu.marks else ""
        entries_latex.append(
            f"""
            \\resumeSubheading
            {{{escape_latex(edu.institution)}}}{{{escape_latex(edu.location)}}}
            {{{escape_latex(edu.degree)}{marks_str}}}
            {{{escape_latex(edu.start_date)} -- {escape_latex(edu.end_date)}}}
        """
        )

    return f"""
    \\section{{{escape_latex(education.section_title)}}}
    \\resumeSubHeadingListStart
    {"".join(entries_latex)}
    \\resumeSubHeadingListEnd
    """


def _generate_skills(skills: SkillsSection) -> str:
    if not skills.entries:
        return ""

    items_latex = []
    for entry in skills.entries:
        items = ", ".join(escape_latex(item) for item in entry.items)
        items_latex.append(
            f"\\resumeItem{{\\textbf{{{escape_latex(entry.category)}}}: {items}}}"
        )

    return f"""
    \\section{{{escape_latex(skills.section_title)}}}
    \\resumeSubHeadingListStart
    \\resumeItemListStart
    {chr(10).join(items_latex)}
    \\resumeItemListEnd
    \\resumeSubHeadingListEnd
    """


def _generate_experience(experience: ExperienceSection) -> str:
    if not experience.entries:
        return ""

    entries_latex = []
    for exp in experience.entries:
        accomplishments = "\n".join(
            f"\\resumeItem{{{escape_latex(a)}}}" for a in exp.accomplishments
        )
        entries_latex.append(
            f"""
            \\resumeSubHeadingListStart
            \\resumeProjectHeading
            {{\\textbf{{{escape_latex(exp.title)}}}}}{{{escape_latex(exp.date)}}}
            \\resumeItemListStart
            {accomplishments}
            \\resumeItemListEnd
            \\resumeSubHeadingListEnd
        """
        )

    return f"""
    \\section{{{escape_latex(experience.section_title)}}}
    {"".join(entries_latex)}
    """


def _generate_projects(projects: ProjectsSection) -> str:
    if not projects.entries:
        return ""

    entries_latex = []
    for proj in projects.entries:
        accomplishments = "\n".join(
            f"\\resumeItem{{{escape_latex(a)}}}" for a in proj.accomplishments
        )
        url_part = ""
        if proj.url:
            url_part = (
                f"\\href{{{escape_url(proj.url)}}}{{{escape_latex(proj.url_label)}}}"
            )

        entries_latex.append(
            f"""
            \\resumeSubHeadingListStart
            \\resumeProjectHeading
            {{\\textbf{{{escape_latex(proj.title)}}}}}{{{url_part}}}
            \\resumeItemListStart
            {accomplishments}
            \\resumeItemListEnd
            \\resumeSubHeadingListEnd
        """
        )

    return f"""
    \\section{{{escape_latex(projects.section_title)}}}
    {"".join(entries_latex)}
    """


def _generate_awards(awards: AwardsSection) -> str:
    if not awards.entries:
        return ""

    items_latex = []
    for award in awards.entries:
        description = escape_latex(award.description)
        url_part = ""
        if award.url:
            label = escape_latex(award.url_label or "Link")
            url_part = (
                f"\\hfill \\href{{{escape_url(award.url)}}}{{\\underline{{{label}}}}}"
            )
        items_latex.append(f"\\resumeItem{{{description}{url_part}}}")

    return f"""
    \\section{{{escape_latex(awards.section_title)}}}
    \\resumeSubHeadingListStart
    {chr(10).join(items_latex)}
    \\resumeSubHeadingListEnd
    """


def _generate_custom_section(custom: CustomSection) -> str:
    if not custom.entries:
        return ""

    entries_latex = []
    for entry in custom.entries:
        parts = []

        if entry.title:
            title_part = f"\\textbf{{{escape_latex(entry.title)}}}"
            if entry.url and entry.url_label:
                title_part += f" \\href{{{escape_url(entry.url)}}}{{{escape_latex(entry.url_label)}}}"
            parts.append(title_part)

        if entry.subtitle:
            parts.append(escape_latex(entry.subtitle))

        header = " -- ".join(parts) if parts else ""
        date_part = escape_latex(entry.date) if entry.date else ""

        bullets = (
            "\n".join(f"\\resumeItem{{{escape_latex(b)}}}" for b in entry.bullets)
            if entry.bullets
            else ""
        )

        if bullets:
            entries_latex.append(
                f"""
                \\resumeSubHeadingListStart
                \\resumeProjectHeading{{{header}}}{{{date_part}}}
                \\resumeItemListStart
                {bullets}
                \\resumeItemListEnd
                \\resumeSubHeadingListEnd
            """
            )
        elif header:
            entries_latex.append(
                f"""
                \\resumeSubHeadingListStart
                \\resumeProjectHeading{{{header}}}{{{date_part}}}
                \\resumeSubHeadingListEnd
            """
            )

    return f"""
    \\section{{{escape_latex(custom.section_title)}}}
    {"".join(entries_latex)}
    """


def _build_document(
    heading: PersonalInfo, contact_line: str, section_content: str
) -> str:
    name = escape_latex(heading.name)
    location = escape_latex(heading.location) if heading.location else ""

    return f"""\\documentclass[letterpaper,11pt]{{article}}

\\usepackage{{latexsym}}
\\usepackage[empty]{{fullpage}}
\\usepackage{{titlesec}}
\\usepackage{{marvosym}}
\\usepackage[usenames,dvipsnames]{{color}}
\\usepackage{{verbatim}}
\\usepackage{{enumitem}}
\\usepackage[hidelinks]{{hyperref}}
\\usepackage{{fancyhdr}}
\\usepackage[english]{{babel}}
\\usepackage{{tabularx}}
\\input{{glyphtounicode}}

\\pagestyle{{fancy}}
\\fancyhf{{}}
\\fancyfoot{{}}
\\renewcommand{{\\headrulewidth}}{{0pt}}
\\renewcommand{{\\footrulewidth}}{{0pt}}

% Adjust margins
\\addtolength{{\\oddsidemargin}}{{-0.5in}}
\\addtolength{{\\evensidemargin}}{{-0.5in}}
\\addtolength{{\\textwidth}}{{1in}}
\\addtolength{{\\topmargin}}{{-.5in}}
\\addtolength{{\\textheight}}{{1.0in}}

\\urlstyle{{same}}

\\raggedbottom
\\raggedright
\\setlength{{\\tabcolsep}}{{0in}}

% Sections formatting
\\titleformat{{\\section}}{{
  \\vspace{{-5pt}}\\scshape\\raggedright\\large
}}{{}}{{0em}}{{}}[\\color{{black}}\\titlerule \\vspace{{-5pt}}]

% Ensure that generated pdf is machine readable/ATS parsable
\\pdfgentounicode=1

%-------------------------
% Custom commands
\\newcommand{{\\resumeItem}}[1]{{
  \\item\\small{{
    {{#1 \\vspace{{-2pt}}}}
  }}
}}

\\newcommand{{\\resumeSubheading}}[4]{{
  \\vspace{{2pt}}\\item
    \\begin{{tabular*}}{{0.97\\textwidth}}[t]{{l@{{\\extracolsep{{\\fill}}}}r}}
      \\textbf{{#1}} & #2 \\\\
      \\textit{{\\small#3}} & \\textit{{\\small #4}} \\\\
    \\end{{tabular*}}\\vspace{{-7pt}}
}}

\\newcommand{{\\resumeSubSubheading}}[2]{{
    \\item
    \\begin{{tabular*}}{{0.97\\textwidth}}{{l@{{\\extracolsep{{\\fill}}}}r}}
      \\textit{{\\small#1}} & \\textit{{\\small #2}} \\\\
    \\end{{tabular*}}\\vspace{{-5pt}}
}}

\\newcommand{{\\resumeProjectHeading}}[2]{{
    \\item
    \\begin{{tabular*}}{{0.97\\textwidth}}{{l@{{\\extracolsep{{\\fill}}}}r}}
      \\small#1 & #2 \\\\
    \\end{{tabular*}}\\vspace{{-10pt}}
}}

\\newcommand{{\\resumeSubItem}}[1]{{\\resumeItem{{#1}}\\vspace{{-1pt}}}}

\\renewcommand\\labelitemii{{$\\vcenter{{\\hbox{{\\tiny$\\bullet$}}}}$}}

\\newcommand{{\\resumeSubHeadingListStart}}{{\\begin{{itemize}}[leftmargin=0.15in, label={{}}]}}
\\newcommand{{\\resumeSubHeadingListEnd}}{{\\end{{itemize}}}}
\\newcommand{{\\resumeItemListStart}}{{\\begin{{itemize}}}}
\\newcommand{{\\resumeItemListEnd}}{{\\end{{itemize}}\\vspace{{-5pt}}}}

%-------------------------------------------
%%%%%%  RESUME STARTS HERE  %%%%%%%%%%%%%%%%%%%%%%%%%%%%

\\begin{{document}}

%----------HEADING----------
\\begin{{center}}
    \\textbf{{\\Huge \\scshape {name}}} \\\\
    \\vspace{{1pt}}
    {contact_line + " \\\\" if contact_line else ""}
    {f"\\small {location}" if location else ""}
\\end{{center}}

{section_content}

\\end{{document}}
"""
