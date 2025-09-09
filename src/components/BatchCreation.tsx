import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Save, 
  X, 
  Package, 
  Calendar, 
  MapPin, 
  Scale,
  DollarSign,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useState } from "react";

interface BatchFormData {
  cropType: string;
  variety: string;
  farmRef: string;
  quantityKg: number;
  basePricePerKg: number;
  harvestDate: string;
  location: string;
  description: string;
  qualityMetrics: {
    moisture: number;
    protein: number;
    fiber: number;
    organic: boolean;
  };
}

export const BatchCreation = ({ onClose }: { onClose: () => void }) => {
  const [formData, setFormData] = useState<BatchFormData>({
    cropType: '',
    variety: '',
    farmRef: '',
    quantityKg: 0,
    basePricePerKg: 0,
    harvestDate: '',
    location: '',
    description: '',
    qualityMetrics: {
      moisture: 0,
      protein: 0,
      fiber: 0,
      organic: false
    }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const cropTypes = [
    'Wheat', 'Rice', 'Corn', 'Soybeans', 'Tomatoes', 'Lettuce', 'Carrots', 'Potatoes',
    'Onions', 'Garlic', 'Peppers', 'Cucumbers', 'Strawberries', 'Blueberries', 'Apples'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In real app, this would call the API
      const response = await fetch('/api/batches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cropType: formData.cropType,
          variety: formData.variety,
          farmRef: formData.farmRef,
          quantityKg: formData.quantityKg,
          basePricePerKgWei: (formData.basePricePerKg * 1e18).toString(), // Convert to Wei
          harvestAt: Math.floor(new Date(formData.harvestDate).getTime() / 1000)
        }),
      });

      if (response.ok) {
        setSubmitStatus('success');
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof BatchFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleQualityChange = (field: keyof BatchFormData['qualityMetrics'], value: any) => {
    setFormData(prev => ({
      ...prev,
      qualityMetrics: { ...prev.qualityMetrics, [field]: value }
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Plus className="h-5 w-5 text-farm-primary" />
                <span>Create New Batch</span>
              </CardTitle>
              <CardDescription>
                Add a new product batch to the supply chain
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center space-x-2">
                <Package className="h-4 w-4" />
                <span>Basic Information</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cropType">Crop Type *</Label>
                  <Select value={formData.cropType} onValueChange={(value) => handleInputChange('cropType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select crop type" />
                    </SelectTrigger>
                    <SelectContent>
                      {cropTypes.map((crop) => (
                        <SelectItem key={crop} value={crop}>{crop}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="variety">Variety</Label>
                  <Input
                    id="variety"
                    value={formData.variety}
                    onChange={(e) => handleInputChange('variety', e.target.value)}
                    placeholder="e.g., Heirloom, Hybrid"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="farmRef">Farm Reference *</Label>
                  <Input
                    id="farmRef"
                    value={formData.farmRef}
                    onChange={(e) => handleInputChange('farmRef', e.target.value)}
                    placeholder="e.g., Green Valley Farm"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="e.g., Salinas Valley, CA"
                  />
                </div>
              </div>
            </div>

            {/* Quantity and Pricing */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center space-x-2">
                <Scale className="h-4 w-4" />
                <span>Quantity & Pricing</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantityKg">Quantity (kg) *</Label>
                  <Input
                    id="quantityKg"
                    type="number"
                    value={formData.quantityKg}
                    onChange={(e) => handleInputChange('quantityKg', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="basePricePerKg">Base Price per kg ($) *</Label>
                  <Input
                    id="basePricePerKg"
                    type="number"
                    step="0.01"
                    value={formData.basePricePerKg}
                    onChange={(e) => handleInputChange('basePricePerKg', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Harvest Information */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Harvest Information</span>
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="harvestDate">Harvest Date *</Label>
                <Input
                  id="harvestDate"
                  type="date"
                  value={formData.harvestDate}
                  onChange={(e) => handleInputChange('harvestDate', e.target.value)}
                />
              </div>
            </div>

            {/* Quality Metrics */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center space-x-2">
                <CheckCircle className="h-4 w-4" />
                <span>Quality Metrics</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="moisture">Moisture (%)</Label>
                  <Input
                    id="moisture"
                    type="number"
                    step="0.1"
                    value={formData.qualityMetrics.moisture}
                    onChange={(e) => handleQualityChange('moisture', parseFloat(e.target.value) || 0)}
                    placeholder="0.0"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="protein">Protein (%)</Label>
                  <Input
                    id="protein"
                    type="number"
                    step="0.1"
                    value={formData.qualityMetrics.protein}
                    onChange={(e) => handleQualityChange('protein', parseFloat(e.target.value) || 0)}
                    placeholder="0.0"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="fiber">Fiber (%)</Label>
                  <Input
                    id="fiber"
                    type="number"
                    step="0.1"
                    value={formData.qualityMetrics.fiber}
                    onChange={(e) => handleQualityChange('fiber', parseFloat(e.target.value) || 0)}
                    placeholder="0.0"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="organic"
                  checked={formData.qualityMetrics.organic}
                  onChange={(e) => handleQualityChange('organic', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="organic">Organic Certified</Label>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Additional notes about this batch..."
                rows={3}
              />
            </div>

            {/* Submit Status */}
            {submitStatus === 'success' && (
              <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-800">Batch created successfully!</span>
              </div>
            )}
            
            {submitStatus === 'error' && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-red-800">Error creating batch. Please try again.</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Batch
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
