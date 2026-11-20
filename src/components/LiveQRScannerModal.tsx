import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeCameraScanConfig } from 'html5-qrcode';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, SwitchCamera, Upload, AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LiveQRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  title?: string;
  description?: string;
}

export const LiveQRScannerModal: React.FC<LiveQRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'Live Camera QR Scanner',
  description = 'Point your camera at a physical lot QR code, weighbridge slip, or PDS voucher'
}) => {
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const elementId = 'harvestlink-live-qr-reader';

  // Discover available cameras
  useEffect(() => {
    if (!isOpen) return;

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          const list = devices.map((d) => ({
            id: d.id,
            label: d.label || `Camera ${d.id.substring(0, 5)}`
          }));
          setCameras(list);
          // Prefer environment/back camera if labeled
          const backCam = list.find((c) => /back|rear|environment/i.test(c.label));
          setSelectedCamera(backCam ? backCam.id : list[0].id);
        } else {
          setErrorMessage('No camera devices detected on this device.');
        }
      })
      .catch((err) => {
        console.warn('Camera discovery error:', err);
        setErrorMessage('Camera access was not granted or is blocked by browser permissions.');
      });
  }, [isOpen]);

  // Start scanner
  const startCameraScanner = async (cameraId: string) => {
    try {
      setErrorMessage(null);
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } else {
        scannerRef.current = new Html5Qrcode(elementId);
      }

      const config: Html5QrcodeCameraScanConfig = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await scannerRef.current.start(
        cameraId,
        config,
        (decodedText) => {
          // Success
          setScannedResult(decodedText);
          if (navigator.vibrate) {
            navigator.vibrate(100);
          }
          // Stop and callback
          stopScanner().then(() => {
            onScanSuccess(decodedText);
            onClose();
          });
        },
        () => {
          // Frame failure (normal while searching)
        }
      );
      setIsScanning(true);
    } catch (err: any) {
      console.error('Failed to start scanner:', err);
      setErrorMessage(err?.message || 'Failed to start camera preview.');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      }
    }
    setIsScanning(false);
  };

  useEffect(() => {
    if (isOpen && selectedCamera) {
      // Delay slightly for modal DOM render
      const t = setTimeout(() => {
        startCameraScanner(selectedCamera);
      }, 300);
      return () => clearTimeout(t);
    } else {
      stopScanner();
    }
  }, [isOpen, selectedCamera]);

  // Handle modal close
  const handleClose = () => {
    stopScanner();
    setScannedResult(null);
    setErrorMessage(null);
    onClose();
  };

  // Scan from uploaded file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setErrorMessage(null);
      const html5QrCode = new Html5Qrcode('harvestlink-file-qr-temp');
      const text = await html5QrCode.scanFile(file, true);
      setScannedResult(text);
      onScanSuccess(text);
      handleClose();
    } catch (err: any) {
      setErrorMessage('Could not find a valid QR code in the uploaded image.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md w-full p-6 space-y-4">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <Camera className="h-5 w-5 text-green-600" />
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* Camera Selector */}
        {cameras.length > 1 && (
          <div className="flex items-center space-x-2">
            <SwitchCamera className="h-4 w-4 text-slate-500" />
            <Select value={selectedCamera} onValueChange={setSelectedCamera}>
              <SelectTrigger className="w-full text-xs">
                <SelectValue placeholder="Select Camera" />
              </SelectTrigger>
              <SelectContent>
                {cameras.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Video Viewport Container */}
        <div className="relative w-full aspect-square bg-slate-950 rounded-lg overflow-hidden border-2 border-slate-700 flex flex-col items-center justify-center">
          <div id={elementId} className="w-full h-full" />
          
          {!isScanning && !errorMessage && (
            <div className="absolute flex flex-col items-center space-y-2 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-green-500" />
              <p className="text-xs">Accessing camera hardware...</p>
            </div>
          )}

          {/* Scanner Aim Reticle */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-56 h-56 border-2 border-green-500 rounded-lg shadow-[0_0_15px_rgba(34,197,94,0.3)] animate-pulse" />
            </div>
          )}
        </div>

        {/* Hidden element for file scanning */}
        <div id="harvestlink-file-qr-temp" className="hidden" />

        {/* Error Feedback */}
        {errorMessage && (
          <Alert variant="destructive" className="py-2 text-xs">
            <AlertCircle className="h-4 w-4 mr-1" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Scanned Feedback */}
        {scannedResult && (
          <Alert className="py-2 text-xs border-green-500 bg-green-50 text-green-800">
            <CheckCircle2 className="h-4 w-4 mr-1 text-green-600" />
            <AlertDescription className="font-mono truncate">
              Scanned: {scannedResult}
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-2 border-t">
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Upload Image Slip
            </Button>
          </div>

          <Button type="button" variant="secondary" size="sm" onClick={handleClose} className="text-xs">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
