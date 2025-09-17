import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  title?: string;
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  isOpen,
  onClose,
  value,
  title = 'Product Verification',
}) => {
  const downloadQRCode = () => {
    const canvas = document.getElementById('qrcode') as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas
        .toDataURL('image/png')
        .replace('image/png', 'image/octet-stream');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `product-qr-${Date.now()}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center space-y-4 py-4">
          <div className="p-4 bg-white rounded-lg">
            <QRCodeSVG
              id="qrcode"
              value={value}
              size={256}
              level="H"
              includeMargin={true}
            />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Scan this QR code to verify product authenticity
          </p>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              <X className="mr-2 h-4 w-4" /> Close
            </Button>
            <Button onClick={downloadQRCode}>
              <Download className="mr-2 h-4 w-4" /> Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
