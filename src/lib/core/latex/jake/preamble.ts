import { MARGINS, SPACING, type JakeOptions } from './options';

const inch = (n: number) => `${n}in`;
const pt = (n: number) => `${n}pt`;

/** The preamble and macro block of the hand-written resume, with the numbers parameterised. */
export function preamble(o: JakeOptions): string {
	const m = MARGINS[o.margins];
	const s = SPACING[o.spacing];
	return `\\documentclass[${o.paper},${o.fontSize}pt]{article}

\\usepackage{latexsym}
\\usepackage[T1]{fontenc}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\input{glyphtounicode}

% Font options
\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\setlength{\\footskip}{5pt}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

% Adjust margins
\\addtolength{\\oddsidemargin}{${inch(m.side)}}
\\addtolength{\\evensidemargin}{${inch(m.side)}}
\\addtolength{\\textwidth}{${inch(m.width)}}
\\addtolength{\\topmargin}{${inch(m.top)}}
\\addtolength{\\textheight}{${inch(m.height)}}

\\urlstyle{same}

\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

% Sections formatting
\\titleformat{\\section}{
  \\vspace{${pt(s.section)}}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{${pt(s.sectionRule)}}]

\\pdfgentounicode=1

%-------------------------
% Custom commands
% One line on purpose: a space or newline between the text and \\vspace is a
% legal break point, and with \\raggedright TeX happily puts the \\vspace on an
% empty second line whenever the text fills the line exactly.
\\newcommand{\\resumeItem}[1]{\\item\\small{{#1\\vspace{${pt(s.item)}}}}}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{${pt(s.subheading)}}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{${pt(s.subheadingAfter)}}
}

% The left cell wraps instead of running into the date when a heading is long.
\\newcommand{\\resumeProjectHeading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{>{\\raggedright\\arraybackslash}p{\\dimexpr0.97\\textwidth-1.6in\\relax}@{\\extracolsep{\\fill}}r}
      \\small#1 & #2 \\\\
    \\end{tabular*}\\vspace{${pt(s.projectAfter)}}
}

\\newcommand{\\resumeSubItem}[1]{\\resumeItem{#1}\\vspace{${pt(s.subItem)}}}
\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}
\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{${pt(s.listEnd)}}}
`;
}
