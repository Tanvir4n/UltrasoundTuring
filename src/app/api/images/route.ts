import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const imagesDir = path.join(process.cwd(), 'public', 'images');
    
    if (!fs.existsSync(imagesDir)) {
      return NextResponse.json({ images: [] });
    }

    const files = fs.readdirSync(imagesDir);
    const validExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff', '.svg']);

    const imageFiles = files
      .filter((file) => validExtensions.has(path.extname(file).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
      .map((file, index) => {
        const id = path.parse(file).name;
        return {
          id: id || `IMG-${String(index + 1).padStart(3, '0')}`,
          fileName: file,
          imageUrl: `/images/${file}`,
          slotNumber: (index % 10) + 1,
        };
      });

    return NextResponse.json({ images: imageFiles });
  } catch (error) {
    console.error('Error reading public/images directory:', error);
    return NextResponse.json({ images: [] }, { status: 500 });
  }
}

