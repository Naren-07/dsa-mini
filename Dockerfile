# Multi-stage Dockerfile for Rover PathLab
FROM gcc:13 AS build

RUN apt-get update && apt-get install -y cmake build-essential

WORKDIR /src
COPY . .

# Build pathlab binary with CMake
RUN cmake -B build -DCMAKE_BUILD_TYPE=Release && cmake --build build --target pathlab

# Slim Debian Runtime Image
FROM debian:stable-slim

WORKDIR /app
COPY --from=build /src/build/pathlab /app/pathlab
COPY web /app/web

EXPOSE 8080

CMD ["/app/pathlab"]
