import { MARGINS, SPACING, type CleanOptions } from './options';

const inch = (n: number) => `${n}in`;
const pt = (n: number) => `${n}pt`;

/** A sans-serif, left-aligned page: bold uppercase section titles over a thin rule, no small caps. */
export function preamble(o: CleanOptions): string {
	const m = MARGINS[o.margins];
	const s = SPACING[o.spacing];
	return `\\documentclass[${o.paper},${o.fontSize}pt]{article}

\\usepackage[T1]{fontenc}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\input{glyphtounicode}
\\pdfgentounicode=1

\\renewcommand{\\familydefault}{\\sfdefault}
\\pagestyle{empty}

\\addtolength{\\oddsidemargin}{${inch(m.side)}}
\\addtolength{\\evensidemargin}{${inch(m.side)}}
\\addtolength{\\textwidth}{${inch(m.width)}}
\\addtolength{\\topmargin}{${inch(m.top)}}
\\addtolength{\\textheight}{${inch(m.height)}}

\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}
\\setlength{\\parindent}{0pt}

% Bold uppercase title, a soft grey rule tight under it, then real space before the first entry.
\\titleformat{\\section}{\\vspace{${pt(s.section)}}\\bfseries\\normalsize\\raggedright\\color[gray]{0.12}}{}{0em}{}[\\vspace{-7pt}{\\color[gray]{0.62}\\rule{\\textwidth}{0.5pt}}\\vspace{${pt(s.afterRule)}}]
\\titlespacing*{\\section}{0pt}{0pt}{0pt}

% One entry: bold title with the date on the right, then an italic line with the place on the right.
% The left column wraps (long project titles, long stacks) instead of running
% into the date; the last row carries no \\\\ so the box ends at its descender.
\\newcommand{\\cleanEntry}[4]{
  \\vspace{${pt(s.entry)}}
  \\begin{tabular*}{\\textwidth}[t]{@{}>{\\raggedright\\arraybackslash}p{\\dimexpr\\textwidth-1.7in\\relax}@{\\extracolsep{\\fill}}r@{}}
    \\textbf{#1} & \\textcolor[gray]{0.35}{\\small #2} \\\\
    \\textcolor[gray]{0.35}{\\small\\itshape #3} & \\textcolor[gray]{0.35}{\\small\\itshape #4}
  \\end{tabular*}\\par
}
% A one-line entry: bold title with the date on the right.
\\newcommand{\\cleanLine}[2]{
  \\vspace{${pt(s.entry)}}
  \\begin{tabular*}{\\textwidth}[t]{@{}>{\\raggedright\\arraybackslash}p{\\dimexpr\\textwidth-1.7in\\relax}@{\\extracolsep{\\fill}}r@{}}
    #1 & \\textcolor[gray]{0.35}{\\small #2}
  \\end{tabular*}\\par
}
\\newcommand{\\cleanItem}[1]{\\item\\small{#1}}
\\newcommand{\\cleanListStart}{\\begin{itemize}[leftmargin=0.15in, label={\\color[gray]{0.45}\\textbullet}, itemsep=${pt(s.itemSep)}, topsep=${pt(s.listTop)}, parsep=0pt, partopsep=0pt]}
\\newcommand{\\cleanListEnd}{\\end{itemize}\\vspace{${pt(s.listEnd)}}}
`;
}
