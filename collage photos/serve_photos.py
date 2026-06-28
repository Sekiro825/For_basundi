import os
import json
import http.server
import socketserver
import urllib.parse

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class PhotoSelectorHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Always resolve relative to the script directory
        path = urllib.parse.unquote(path)
        path = path.lstrip('/')
        # Prevent simple directory traversal
        parts = path.split('/')
        if '..' in parts or any(p.startswith('/') for p in parts):
            return ""
        return os.path.join(DIRECTORY, *parts)

    def do_GET(self):
        url = urllib.parse.urlparse(self.path)
        path = url.path
        
        if path == "/api/photos":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            
            # Load metadata
            metadata_file = os.path.join(DIRECTORY, "photo_metadata.json")
            selections_file = os.path.join(DIRECTORY, "selected_moments.json")
            
            photos = []
            if os.path.exists(metadata_file):
                with open(metadata_file, "r", encoding="utf-8") as f:
                    photos = json.load(f)
                    
            selections = {}
            if os.path.exists(selections_file):
                try:
                    with open(selections_file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        # Build a map of filename -> selection data
                        for item in data:
                            selections[item["filename"]] = item
                except Exception as e:
                    print(f"Error reading selected_moments.json: {e}")
                    
            # Merge selections into photos metadata
            for p in photos:
                fname = p["filename"]
                default_rotation = 90 if fname in ["Snapchat-922464268.jpg", "Snapchat-1500244527.jpg"] else 0
                if fname in selections:
                    p["selected"] = selections[fname].get("selected", False)
                    p["caption"] = selections[fname].get("caption", "")
                    p["tags"] = selections[fname].get("tags", [])
                    p["style_mode"] = selections[fname].get("style_mode", 1)
                    p["custom_date"] = selections[fname].get("custom_date", p["date"])
                    p["rotation"] = selections[fname].get("rotation", default_rotation)
                else:
                    p["selected"] = False
                    p["caption"] = ""
                    p["tags"] = []
                    p["style_mode"] = 1
                    p["custom_date"] = p["date"]
                    p["rotation"] = default_rotation
            
            self.wfile.write(json.dumps(photos).encode("utf-8"))
            return

        elif path == "/" or path == "/index.html":
            # Redirect to photo_selector.html
            self.send_response(302)
            self.send_header("Location", "/photo_selector.html")
            self.end_headers()
            return
            
        # Fallback to serving the static file
        super().do_GET()

    def do_POST(self):
        url = urllib.parse.urlparse(self.path)
        path = url.path
        
        if path == "/api/save":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                selections = json.loads(post_data.decode("utf-8"))
                selections_file = os.path.join(DIRECTORY, "selected_moments.json")
                
                with open(selections_file, "w", encoding="utf-8") as f:
                    json.dump(selections, f, indent=2, ensure_ascii=False)
                    
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode("utf-8"))
                print(f"Successfully saved {len(selections)} selections.")
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
                print(f"Error saving selections: {e}")
            return
            
        self.send_response(404)
        self.end_headers()

def run():
    # Make sure we change directory to the script's directory so it finds static files
    os.chdir(DIRECTORY)
    # Enable socket reuse to avoid "Address already in use" errors on restarts
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), PhotoSelectorHandler) as httpd:
        print(f"Serving photos at http://localhost:{PORT}")
        print("Press Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopping server.")

if __name__ == "__main__":
    run()
