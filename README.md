# VisionServe

A production-oriented computer vision inference platform: a modern C++ backend ([Drogon](https://github.com/drogonframework/drogon), ONNX Runtime, OpenCV) exposing REST and gRPC APIs, paired with a TanStack Start operator dashboard. Built incrementally, release by release — see the [wiki](../../wiki) for the full roadmap, architecture, and setup guide.

**📖 [Full documentation & roadmap in the wiki →](../../wiki)**

## What's here today

- `visionserve_sanity` / `visionserve_api` — the C++ backend (CMake + vcpkg, builds on Windows MSVC and Linux GCC/Clang). `visionserve_api` is a Drogon HTTP server with `/health`, `/ready`, `/version`, and CORS.
- `web/` — the operator dashboard (TanStack Start / React), fully click-through on mock data.
- `Dockerfile` + `railway.json` — backend container, deployable to Railway.
- `web/vite.config.ts` (nitro `vercel` preset) — frontend deployable to Vercel.
- `.github/workflows/ci.yml` — Windows MSVC + Linux GCC/Clang builds, clang-format check, frontend lint/typecheck/build.

See the wiki's [Getting Started](../../wiki/Getting-Started) page for full build instructions, [Backend](../../wiki/Backend) / [Frontend](../../wiki/Frontend) for what's implemented, and [Deployment](../../wiki/Deployment) for shipping to Vercel + Railway.

## Quick start

```bash
# Backend (from a shell with VCPKG_ROOT set)
cmake --preset linux-gcc-debug   # or windows-msvc-debug on Windows
cmake --build --preset linux-gcc-debug
./build/linux-gcc-debug/visionserve_api &
curl http://127.0.0.1:8081/health

# Frontend
cd web
npm install
npm run dev   # http://localhost:8080
```

## License

[MIT](LICENSE)
