import fitz
from PIL import Image
import os
import io

SVG_PATH = r"d:\Coding\OWN-PROJECTS\linguamaxima\apps\web\public\favicon.svg"
PUBLIC_DIR = r"d:\Coding\OWN-PROJECTS\linguamaxima\apps\web\public"

def main():
    doc = fitz.open(SVG_PATH)
    page = doc[0]
    
    # Target sizes to generate
    sizes = {
        "favicon-16x16.png": (16, 16),
        "favicon-32x32.png": (32, 32),
        "favicon-48x48.png": (48, 48),
        "apple-touch-icon.png": (180, 180),
        "android-chrome-192x192.png": (192, 192),
        "android-chrome-512x512.png": (512, 512),
    }

    # Render at super-sampled resolution for crisp scaling
    high_res_pix = page.get_pixmap(dpi=300)
    high_res_img = Image.open(io.BytesIO(high_res_pix.tobytes("png"))).convert("RGBA")

    pil_images = {}
    for filename, (w, h) in sizes.items():
        out_path = os.path.join(PUBLIC_DIR, filename)
        resized = high_res_img.resize((w, h), Image.Resampling.LANCZOS)
        resized.save(out_path, format="PNG", optimize=True)
        pil_images[(w, h)] = resized
        print(f"Generated {filename} ({w}x{h})")

    # Generate multi-resolution favicon.ico (16, 32, 48)
    ico_path = os.path.join(PUBLIC_DIR, "favicon.ico")
    ico_sizes = [(16, 16), (32, 32), (48, 48)]
    ico_imgs = [pil_images[s] for s in ico_sizes]
    
    ico_imgs[0].save(
        ico_path,
        format="ICO",
        sizes=ico_sizes,
        append_images=ico_imgs[1:]
    )
    print(f"Generated favicon.ico with sizes: {ico_sizes}")

if __name__ == "__main__":
    main()
