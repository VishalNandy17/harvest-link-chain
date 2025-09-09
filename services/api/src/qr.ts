import QRCode from 'qrcode';
import path from 'path';

export async function generateQR(id: string): Promise<string> {
  const filePath = path.join(__dirname, '../public/qr', `${id}.png`);
  await QRCode.toFile(filePath, id);
  return `/public/qr/${id}.png`;
}
