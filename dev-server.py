import http.server
import socketserver
import webbrowser
import os

PORT = 3000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

# Change to the directory containing the files
os.chdir(os.path.dirname(os.path.abspath(__file__)))

Handler = MyHTTPRequestHandler

try:
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"🚀 Propace Test Server running at http://localhost:{PORT}")
        print(f"📝 Test form: http://localhost:{PORT}/test-form-fixed.html")
        print("💡 Use Ctrl+C to stop server")
        print("=" * 50)
        
        # Auto-open test form
        webbrowser.open(f'http://localhost:{PORT}/test-form-fixed.html')
        
        httpd.serve_forever()
except KeyboardInterrupt:
    print("\n🛑 Server stopped")
except OSError as e:
    if e.errno == 10048:  # Port already in use
        print(f"❌ Port {PORT} is already in use")
        print(f"💡 Try opening: http://localhost:{PORT}/test-form-fixed.html")
    else:
        print(f"❌ Server error: {e}")
