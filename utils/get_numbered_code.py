import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def get_numbered_code_from_file(file_path: str) -> str:
    """
    Reads a file and returns its content with each line numbered.
    Line numbers are formatted with 5 digits (e.g., 00001: line).
    """
    numbered = [
        f"{i:05d}: {ln.rstrip()}"  # 5 digits for line numbers, up to 99999 lines
        for i, ln in enumerate(open(file_path), 1)
    ]
    return "\n".join(numbered)

if __name__ == "__main__":
    # Example usage: number the lines of 'page.html' and print them
    numbered = get_numbered_code_from_file("page.html")
    print("==> [INFO]:\n" + numbered)