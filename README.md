# 3d-flowers — Lilium Orientalis 3D Botanical Experience

An ultra-aesthetic, cinematic procedural 3D botanical reconstruction and animation of an **Oriental Lily (Lilium orientalis)** bouquet. Built upon parametric mathematics, this project delivers museum-grade aesthetics across **both an interactive real-time 3D WebGL experience** and an **upgraded Python rendering engine**.

---

## ✨ Aesthetic & Architectural Enhancements

| Feature | Original Python Script | Enhanced Project |
| :--- | :--- | :--- |
| **Rendering Pipeline** | CPU software quad rasterization (`cv2.fillConvexPoly`) | **Dual Engine**: Real-time WebGL (Three.js + SSS) & Enhanced Subpixel Python Shading |
| **Petal Shading & SSS** | Flat-faceted quad lighting, no transmission | **Subsurface Scattering (SSS)**: Translucent petals with glowing backlit coral warmth |
| **Micro-Botanical Details**| Basic raised dots | **Morning Dew Drops** with specular refraction glints + **Embossed 3D Papillae** & Nectary Furrow |
| **Petal Curvature** | Standard 6-tepal whorl | **Ruffled Margin Undulation** ($\sin(6\pi u) \cdot |v|^{2.2}$) + non-intersecting cylindrical-to-planar throat wrap |
| **Atmosphere & Optics** | Single Gaussian blur | **Cinematic Anamorphic Bloom**, Volumetric Golden Pollen Bokeh storm, and lens flares |
| **Typography & HUD** | Jagged Hershey plotter font (`FONT_HERSHEY_SIMPLEX`) | **Editorial Luxury Typography** (*Cormorant Garamond*, *Outfit*, *JetBrains Mono*, and Pillow TrueType) |
| **Interactivity** | Offline MP4 only | **Full 60 FPS Web App**: 3D Orbit, Timeline Scrubber, 4 Cultivars, 4K Snapshots, In-Browser Video Recording |
| **Video Encoding** | Crashes if FFmpeg is missing | **Resilient Video Pipeline**: Auto-detects FFmpeg or falls back to `cv2.VideoWriter` (MP4V) |

---

## 🚀 1. Interactive 3D Web Application

The interactive web experience runs in any modern web browser at silky 60 FPS, providing a live 9:16 Instagram/TikTok Reel simulator and studio controls.

### Quick Launch
```bash
# In the project directory:
python -m http.server 8080
```
Open **`http://localhost:8080/index.html`** in your browser.

### Key Interactive Controls:
- **📱 9:16 Reel vs. Full Canvas**: Toggle between vertical Instagram Reel safe-zone preview and expansive studio full-screen.
- **🎬 Timeline Scrubber & Stage Jumper**:
  - `Stage 01` (0.0s – 2.3s): Vascular Stems & Lanceolate Foliage
  - `Stage 02` (2.3s – 4.6s): 3D Isoline Blueprint Wireframe
  - `Stage 03` (4.6s – 7.8s): Petal Materialization, SSS Shading & Morning Dew
  - `Stage 04` (7.8s – 10.2s): Androecium Filaments, Pollen Anthers & Stigma
  - `Stage 05` (10.2s – 13.0s): Complete Bouquet Turntable Showcase
- **🌺 Cultivar Selector**:
  - **Stargazer**: Deep ruby-crimson heart, snow-white ruffled margins, and dark wine freckles.
  - **Casablanca**: Pure porcelain white with emerald nectar throat star.
  - **Sunset Aurora**: Warm coral, peach, and golden honey gradients.
  - **Black Beauty**: Ultra-deep velvety burgundy with radiant gold dust.
- **📷 Camera Modes**: Cinematic Orbit, Hero Bloom focus, Petal Macro close-up, Golden Anthers, Crown Top-Down, or Free 3D Orbit.
- **📸 4K Snapshot & 🎥 In-Browser Video Recorder**: Capture 4K Ultra-HD photos or record a complete 13-second 9:16 WebM/MP4 Reel directly with one click!
- **🎵 Ambient Audio Generator**: Synthesizes generative botanical wind and crystal chimes using the Web Audio API.

---

## 🐍 2. Enhanced Python Animation Generator

The upgraded Python script (`enhanced_lily_animation.py`) renders high-resolution 1080 &times; 1920 vertical video frames directly from Python.

### Requirements
```bash
pip install numpy opencv-python pillow
```

### Render Instant Preview Keyframes
To render 4 keyframe milestones (1.8s, 3.8s, 6.4s, 11.5s):
```bash
python enhanced_lily_animation.py --preview
```
Output files will be saved as `enhanced_preview_1.8s.png`, `enhanced_preview_3.8s.png`, `enhanced_preview_6.4s.png`, and `enhanced_preview_11.5s.png`.

### Render Full 13-Second Video (390 frames @ 30 FPS)
```bash
python enhanced_lily_animation.py
```
Outputs `enhanced_lily_animation.mp4`.

---

## 📐 Botanical Mathematics

1. **Stem Bishop Transport Frame**:
   Smooth twist-free spatial orientation computed via parallel transport $\mathbf{n}_1(u), \mathbf{n}_2(u)$ along cubic Bezier tangents $\mathbf{T}(u)$, with hexagonal longitudinal bark ridges:
   $$r(u, \theta) = r(u) \cdot \left(1.0 + 0.035 \cos(6\theta)\right)$$

2. **Petal Midrib Flare & Recurvature**:
   $$\theta(u) = \theta_{\text{base}} + \theta_{\text{flare}} \cdot S(0.04, 0.58, u) + (\theta_{\text{recurve}} - \theta_{\text{flare}}) \cdot S(0.40, 1.0, u)^{1.25}$$

3. **Crenulate Margin Ruffling**:
   $$\Delta_{\text{ruffle}}(u, v) = A_{\text{ruffle}} \cdot \sin(\pi u) \cdot |v|^{2.2} \cdot \sin(6\pi u \pm 0.85 \operatorname{sgn}(v))$$

4. **Physically-Inspired Subsurface Scattering (SSS)**:
   $$I_{\text{lit}} = I_{\text{diffuse}} + I_{\text{specular}} + I_{\text{base}} \cdot k_{\text{sss}} \left(0.60 \cdot \max(0, -\mathbf{N} \cdot \mathbf{L}_{\text{back}})^{1.6} + 0.40 \cdot (1 - \mathbf{N} \cdot \mathbf{V})^{2.4}\right)$$

---

## 📁 Repository Structure

```text
├── index.html                   # Interactive 3D WebGL Web Application
├── style.css                    # Luxury dark botanical design system & glassmorphism
├── app.js                       # Three.js parametric lily engine, shaders & recorder
├── enhanced_lily_animation.py   # Upgraded Python renderer with SSS & dew drops
├── package.json                 # Node dependencies (Three.js)
├── README.md                    # Documentation & botanical specs
└── enhanced_preview_*.png       # Generated high-resolution preview frames
```
