# Builds and runs visionserve_api (see apps/api_server). Used for Railway deployment
# (see docs/deployment.md) and for local `docker build` verification.

FROM ubuntu:24.04 AS builder

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    ninja-build \
    git \
    curl \
    zip \
    unzip \
    tar \
    pkg-config \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Pinned to the same commit used in .github/workflows/ci.yml for reproducible dependency
# resolution across local dev, CI, and this image.
ARG VCPKG_COMMIT=c1d80d9cb071c3f4a98c67c1196b137cc5b72918
RUN git clone https://github.com/microsoft/vcpkg.git /opt/vcpkg \
    && git -C /opt/vcpkg checkout ${VCPKG_COMMIT} \
    && /opt/vcpkg/bootstrap-vcpkg.sh -disableMetrics
ENV VCPKG_ROOT=/opt/vcpkg

WORKDIR /src
COPY CMakeLists.txt CMakePresets.json vcpkg.json ./
COPY apps ./apps

RUN cmake --preset linux-gcc-release \
    && cmake --build --preset linux-gcc-release

FROM ubuntu:24.04 AS runtime

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --no-create-home --shell /usr/sbin/nologin visionserve

COPY --from=builder /src/build/linux-gcc-release/visionserve_api /app/visionserve_api

# Drogon writes its default upload temp dir relative to the working directory
# (./uploads/tmp/...); give the non-root user a writable one.
RUN mkdir -p /app/uploads && chown -R visionserve:visionserve /app

WORKDIR /app
USER visionserve
ENV PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
    CMD curl -f "http://127.0.0.1:${PORT}/health" || exit 1

ENTRYPOINT ["/app/visionserve_api"]
