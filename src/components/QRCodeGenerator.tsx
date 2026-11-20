import React, { useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, QrCode, ExternalLink, Printer } from 'lucide-react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';

interface QRCodeGeneratorProps {
  data: string;
  title?: string;
  description?: string;
  size?: number;
  showDialog?: boolean;
  onClose?: () => void;
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  data,
  title = "QR Code",
  description = "Scan this QR code to verify authenticity",
  size = 200,
  showDialog,
  onClose
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);

  // If used as a modal dialog and showDialog is false, do not render anything on page
  if (showDialog !== undefined && !showDialog) {
    return null;
  }

  const downloadQRCode = () => {
    if (!data) return;
    const canvas = canvasRef.current?.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `harvestlink-qr-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const printQRCode = () => {
    window.print();
  };

  const QRCodeContent = () => (
    <div className="flex flex-col items-center space-y-4 py-2">
      <div className="flex items-center space-x-2 text-green-700">
        <QrCode className="h-5 w-5" />
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      
      {!data ? (
        <div className="flex flex-col items-center justify-center w-52 h-52 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50 p-4 text-center">
          <QrCode className="h-10 w-10 text-gray-400 mb-2 stroke-1" />
          <p className="text-sm font-medium text-gray-600">No Lot Selected</p>
          <p className="text-xs text-gray-400 mt-1">Select or create a crop produce lot to view its verification QR code.</p>
        </div>
      ) : (
        <div className="text-center bg-white p-4 rounded-xl border shadow-sm">
          <QRCodeSVG 
            value={data} 
            size={size} 
            level="H" 
            includeMargin={true}
            className="mx-auto"
          />
          {/* Hidden Canvas for crisp PNG downloads */}
          <div ref={canvasRef} className="hidden">
            <QRCodeCanvas value={data} size={400} level="H" includeMargin={true} />
          </div>
          <p className="text-xs font-mono text-gray-500 mt-3 max-w-xs break-all bg-gray-50 px-2 py-1 rounded border">
            {data}
          </p>
        </div>
      )}
      
      {data && (
        <div className="flex flex-wrap gap-2 justify-center pt-2">
          <Button 
            variant="outline" 
            onClick={downloadQRCode}
            className="flex items-center space-x-1.5 text-xs h-9 bg-white"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download PNG</span>
          </Button>

          <Button 
            variant="outline" 
            onClick={printQRCode}
            className="flex items-center space-x-1.5 text-xs h-9 bg-white"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Label</span>
          </Button>

          {data.startsWith('http') && (
            <Button 
              variant="outline"
              asChild
              className="flex items-center space-x-1.5 text-xs h-9 bg-white text-green-700 hover:text-green-800"
            >
              <a href={data} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Verify URL</span>
              </a>
            </Button>
          )}
        </div>
      )}
    </div>
  );

  if (showDialog !== undefined) {
    return (
      <Dialog open={showDialog} onOpenChange={onClose}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-center">{title}</DialogTitle>
            <DialogDescription className="text-center">{description}</DialogDescription>
          </DialogHeader>
          <QRCodeContent />
          <DialogFooter className="sm:justify-center">
            <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Only render card if data is present or inline use
  if (!data) return null;

  return (
    <Card className="w-full max-w-md mx-auto my-4 shadow-sm border-green-100">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center space-x-2 text-base">
          <QrCode className="h-4 w-4 text-green-600" />
          <span>{title}</span>
        </CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <QRCodeContent />
      </CardContent>
    </Card>
  );
};

export default QRCodeGenerator;
