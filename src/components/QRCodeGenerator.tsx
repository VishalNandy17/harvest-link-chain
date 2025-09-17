import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, QrCode } from 'lucide-react';
import { generateQRCodeDataURL } from '@/lib/blockchain';

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
  showDialog = false,
  onClose
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (data) {
      generateQRCode();
    }
  }, [data]);

  const generateQRCode = async () => {
    setLoading(true);
    try {
      const url = await generateQRCodeDataURL(data);
      setQrCodeUrl(url);
    } catch (error) {
      console.error('Error generating QR code:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (qrCodeUrl) {
      const link = document.createElement('a');
      link.href = qrCodeUrl;
      link.download = `qr-code-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const QRCodeContent = () => (
    <div className="flex flex-col items-center space-y-4">
      <div className="flex items-center space-x-2">
        <QrCode className="h-5 w-5" />
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center w-48 h-48 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Generating QR Code...</p>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <img 
            src={qrCodeUrl} 
            alt="QR Code" 
            className="mx-auto border rounded-lg shadow-sm"
            style={{ width: size, height: size }}
          />
          <p className="text-sm text-gray-600 mt-2 max-w-xs break-all">{data}</p>
        </div>
      )}
      
      <div className="flex space-x-2">
        <Button 
          variant="outline" 
          onClick={downloadQRCode}
          disabled={loading || !qrCodeUrl}
          className="flex items-center space-x-2"
        >
          <Download className="h-4 w-4" />
          <span>Download</span>
        </Button>
        <Button 
          variant="outline" 
          onClick={generateQRCode}
          disabled={loading}
        >
          Regenerate
        </Button>
      </div>
    </div>
  );

  if (showDialog) {
    return (
      <Dialog open={showDialog} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <QRCodeContent />
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <QrCode className="h-5 w-5" />
          <span>{title}</span>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <QRCodeContent />
      </CardContent>
    </Card>
  );
};

export default QRCodeGenerator;