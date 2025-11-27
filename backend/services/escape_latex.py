"""
LaTeX escape function to prevent injection attacks.
Ported from TypeScript: src/lib/utils.ts
"""

import re
from typing import List


def escape_latex(text: str) -> str:
    """
    Escape special LaTeX characters and block dangerous commands.
    This is critical for security when accepting user input.

    Args:
        text: Raw text to escape

    Returns:
        Escaped text safe for LaTeX compilation
    """
    if not text:
        return ""

    # Order matters! Backslash must be first
    escaped = text

    # Escape special characters
    escaped = escaped.replace("\\", "\\textbackslash{}")  # Backslash
    escaped = escaped.replace("_", "\\_")  # Underscore
    escaped = escaped.replace("{", "\\{")  # Left brace
    escaped = escaped.replace("}", "\\}")  # Right brace
    escaped = escaped.replace("$", "\\$")  # Dollar sign
    escaped = escaped.replace("%", "\\%")  # Percent sign
    escaped = escaped.replace("#", "\\#")  # Hash
    escaped = escaped.replace("&", "\\&")  # Ampersand
    escaped = escaped.replace("^", "\\^{}")  # Caret (superscript)
    escaped = escaped.replace("~", "\\textasciitilde{}")  # Tilde
    escaped = escaped.replace("`", "\\textasciigrave{}")  # Backtick
    escaped = escaped.replace('"', "''")  # Double quote
    escaped = escaped.replace("'", "''")  # Single quote

    # List of dangerous commands to block
    dangerous_commands: List[str] = [
        "write",
        "read",
        "openin",
        "openout",
        "input",
        "include",
        "import",
        "usepackage",
        "documentclass",
        "lstinputlisting",
        "verbatiminput",
        "immediate",
        "newcommand",
        "renewcommand",
        "def",
        "let",
        "futurelet",
        "catcode",
        "makeatletter",
        "csname",
        "endcsname",
        "message",
        "special",
        "shell",
        "ShellEscape",
        "write18",
        "PassOptionsToPackage",
        "afterassignment",
        "expandafter",
    ]

    # Block dangerous commands that might have been escaped
    for command in dangerous_commands:
        # Match the escaped backslash followed by command name
        pattern = rf"\\textbackslash\{{\}}\s*({re.escape(command)})"
        escaped = re.sub(pattern, r"[BLOCKED:\1]", escaped, flags=re.IGNORECASE)

    # Block verbatim environments which could bypass escaping
    verbatim_pattern = r"\\begin\s*\{\s*(verbatim|lstlisting|minted|alltt)\s*\}"
    escaped = re.sub(
        verbatim_pattern, "[BLOCKED:VERBATIM]", escaped, flags=re.IGNORECASE
    )

    # Block potentially dangerous math environments
    math_environments = ["equation", "align", "displaymath", "math", "eqnarray"]
    for env in math_environments:
        pattern = rf"\\begin\s*\{{\s*{env}\s*\}}"
        escaped = re.sub(pattern, f"[SANITIZED:{env}]", escaped, flags=re.IGNORECASE)

    # Block attempts to use comments for injection
    escaped = re.sub(r"\\%\s*(\\[a-zA-Z]+)", r"\\% [BLOCKED:\1]", escaped)

    # Block attempts to create new commands
    escaped = re.sub(
        r"\\textbackslash\{\}(new|renew|provide)[a-zA-Z]*",
        "[BLOCKED:COMMAND-DEFINITION]",
        escaped,
        flags=re.IGNORECASE,
    )

    # Block TeX primitives that could be used for injection
    tex_primitives = [
        "atop",
        "above",
        "over",
        "mathchoice",
        "discretionary",
        "loop",
        "repeat",
        "unless",
        "ifx",
        "ifnum",
    ]
    for primitive in tex_primitives:
        pattern = rf"\\textbackslash\{{\}}{primitive}"
        escaped = re.sub(
            pattern, f"[BLOCKED:{primitive}]", escaped, flags=re.IGNORECASE
        )

    return escaped


def escape_url(url: str) -> str:
    """
    Escape a URL for use in LaTeX \\href commands.
    URLs need less aggressive escaping but still need to be safe.

    Args:
        url: URL to escape

    Returns:
        Escaped URL safe for LaTeX
    """
    if not url:
        return ""

    # Only escape characters that would break LaTeX commands
    escaped = url
    escaped = escaped.replace("%", "\\%")
    escaped = escaped.replace("#", "\\#")
    escaped = escaped.replace("&", "\\&")
    escaped = escaped.replace("_", "\\_")

    return escaped
