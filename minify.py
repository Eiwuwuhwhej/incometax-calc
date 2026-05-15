import urllib.request
import urllib.parse
import json

def minify_css(file_path, output_path):
    print(f"Minifying {file_path}...")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            css_code = f.read()
        
        # Simple CSS minification logic
        # Remove comments
        import re
        css_code = re.sub(r'/\*.*?\*/', '', css_code, flags=re.DOTALL)
        # Remove whitespace
        css_code = re.sub(r'\s+', ' ', css_code)
        css_code = css_code.replace('{ ', '{').replace(' }', '}').replace('; ', ';').replace(': ', ':').replace(', ', ',')
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(css_code.strip())
            
        print(f"Successfully minified {file_path} to {output_path}")
    except Exception as e:
        print(f"Error minifying {file_path}: {e}")

def minify_js(file_path, output_path):
    print(f"Minifying {file_path} using jsmin...")
    try:
        from jsmin import jsmin
        with open(file_path, 'r', encoding='utf-8') as f:
            js_code = f.read()

        minified_js = jsmin(js_code)
            
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(minified_js)
            
        print(f"Successfully minified {file_path} to {output_path}")
    except ImportError:
        print("jsmin module not found. Please install it using 'pip install jsmin'")
    except Exception as e:
        print(f"Error minifying {file_path}: {e}")

if __name__ == "__main__":
    minify_css('styles.css', 'styles.min.css')
    minify_js('script.js', 'script.min.js')
