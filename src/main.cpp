#include "api.hpp"
#include <iostream>
#include <string>

int main(int argc, char* argv[]) {
    int port = 8080;
    std::string host = "0.0.0.0";

    if (argc > 1) {
        port = std::stoi(argv[1]);
    }

    httplib::Server svr;

    // Serve static files from web/ directory
    bool mounted = svr.set_mount_point("/", "./web");
    if (!mounted) {
        std::cerr << "[Warning] Failed to mount ./web directory. Checking fallback locations...\n";
        svr.set_mount_point("/", "../web");
    }

    // Register API endpoints
    pathlab::register_routes(svr);

    std::cout << "====================================================\n";
    std::cout << "  Rover PathLab C++ Backend (v2.0)\n";
    std::cout << "  Listening on http://" << host << ":" << port << "\n";
    std::cout << "  Web UI: http://localhost:" << port << "\n";
    std::cout << "  Health Check: http://localhost:" << port << "/api/health\n";
    std::cout << "====================================================\n";

    if (!svr.listen(host.c_str(), port)) {
        std::cerr << "[Error] Failed to bind to " << host << ":" << port << "\n";
        return 1;
    }

    return 0;
}
