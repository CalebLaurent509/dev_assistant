import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import re

def extract_html_only(text):
    """
    Extracts only the HTML code between <html> and </html> tags from the input text.
    Also removes Markdown code block markers (```html ... ```).
    Returns the cleaned HTML code as a string, or an empty string if not found.
    """
    match = re.search(r'<html[\s\S]*?</html>', text, re.IGNORECASE)
    if match:
        html_code = match.group(0)
        # Remove Markdown code block markers
        html_code = re.sub(r'```html\s*', '', html_code)
        html_code = re.sub(r'```', '', html_code)
        return html_code.strip()
    return ''