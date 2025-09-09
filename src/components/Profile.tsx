import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Settings, 
  Shield, 
  Tractor, 
  Package, 
  Store, 
  Eye,
  Edit,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Key,
  Mail,
  Phone,
  MapPin,
  Building,
  Calendar,
  Award,
  Plus
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

type UserRole = 'farmer' | 'distributor' | 'retailer' | 'consumer';

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  organization: string;
  role: UserRole;
  verified: boolean;
  joinDate: string;
  avatar?: string;
  permissions: string[];
  certifications: string[];
}

export const Profile = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('farmer');

  // Mock user profile data - in real app, this would come from API
  const [profile, setProfile] = useState<UserProfile>({
    id: user?.id || 'user-123',
    email: user?.email || 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1 (555) 123-4567',
    address: '123 Farm Road, Agricultural District, CA 90210',
    organization: 'Green Valley Organic Farm',
    role: 'farmer',
    verified: true,
    joinDate: '2024-01-15',
    avatar: user?.user_metadata?.avatar_url || '',
    permissions: ['create_batches', 'transfer_ownership', 'view_analytics'],
    certifications: ['USDA Organic', 'Fair Trade Certified', 'Non-GMO Project']
  });

  const roleData = {
    farmer: {
      title: "Farmer",
      description: "Grow and harvest agricultural products",
      icon: <Tractor className="h-6 w-6" />,
      color: "bg-farm-primary",
      permissions: [
        "Create new product batches",
        "Set initial quality metrics", 
        "Transfer ownership to distributors",
        "Track products through supply chain"
      ]
    },
    distributor: {
      title: "Distributor",
      description: "Receive, assess, and distribute products",
      icon: <Package className="h-6 w-6" />,
      color: "bg-blockchain-blue",
      permissions: [
        "Receive batches from farmers",
        "Update quality assessments",
        "Set pricing information",
        "Transfer to retailers"
      ]
    },
    retailer: {
      title: "Retailer", 
      description: "Manage inventory and serve consumers",
      icon: <Store className="h-6 w-6" />,
      color: "bg-trust-green",
      permissions: [
        "Receive products from distributors",
        "Finalize batch information",
        "Generate QR codes for consumers",
        "Handle disputes if needed"
      ]
    },
    consumer: {
      title: "Consumer",
      description: "Verify products and access information",
      icon: <User className="h-6 w-6" />,
      color: "bg-harvest-amber", 
      permissions: [
        "Scan QR codes to see product history",
        "View complete supply chain trace",
        "Verify product authenticity",
        "Access quality and pricing data"
      ]
    }
  };

  const handleSave = () => {
    // In real app, this would save to API
    setProfile(prev => ({ ...prev, role: selectedRole }));
    setIsEditing(false);
  };

  const handleCancel = () => {
    setSelectedRole(profile.role);
    setIsEditing(false);
  };

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Profile Settings</h1>
            <p className="text-muted-foreground">Manage your account and role preferences</p>
          </div>

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="role">Role & Permissions</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="certifications">Certifications</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Personal Information</CardTitle>
                      <CardDescription>Update your personal details and contact information</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      {isEditing ? <X className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
                      {isEditing ? 'Cancel' : 'Edit'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={profile.firstName}
                        disabled={!isEditing}
                        onChange={(e) => setProfile(prev => ({ ...prev, firstName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={profile.lastName}
                        disabled={!isEditing}
                        onChange={(e) => setProfile(prev => ({ ...prev, lastName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profile.email}
                        disabled={true}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={profile.phone}
                        disabled={!isEditing}
                        onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={profile.address}
                        disabled={!isEditing}
                        onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="organization">Organization</Label>
                      <Input
                        id="organization"
                        value={profile.organization}
                        disabled={!isEditing}
                        onChange={(e) => setProfile(prev => ({ ...prev, organization: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  {isEditing && (
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={handleCancel}>
                        Cancel
                      </Button>
                      <Button onClick={handleSave}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="role" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>Role & Permissions</span>
                  </CardTitle>
                  <CardDescription>
                    Select your role in the supply chain and view associated permissions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Current Role Display */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`${roleData[profile.role].color} text-white p-3 rounded-lg`}>
                        {roleData[profile.role].icon}
                      </div>
                      <div>
                        <h3 className="font-semibold">{roleData[profile.role].title}</h3>
                        <p className="text-sm text-muted-foreground">{roleData[profile.role].description}</p>
                      </div>
                    </div>
                    <Badge variant={profile.verified ? "default" : "secondary"}>
                      {profile.verified ? "Verified" : "Pending"}
                    </Badge>
                  </div>

                  {/* Role Selection */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Select Your Role</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(roleData).map(([role, data]) => (
                        <div
                          key={role}
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            selectedRole === role 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => setSelectedRole(role as UserRole)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`${data.color} text-white p-2 rounded-lg`}>
                              {data.icon}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium">{data.title}</h4>
                              <p className="text-sm text-muted-foreground">{data.description}</p>
                            </div>
                            {selectedRole === role && (
                              <CheckCircle className="h-5 w-5 text-primary" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Permissions for Selected Role */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Permissions for {roleData[selectedRole].title}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {roleData[selectedRole].permissions.map((permission, index) => (
                        <div key={index} className="flex items-center space-x-2 p-3 bg-muted/30 rounded-lg">
                          <CheckCircle className="h-4 w-4 text-trust-green" />
                          <span className="text-sm">{permission}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSave}>
                      <Save className="h-4 w-4 mr-2" />
                      Update Role
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Key className="h-5 w-5" />
                    <span>Security Settings</span>
                  </CardTitle>
                  <CardDescription>
                    Manage your account security and authentication preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Shield className="h-5 w-5 text-trust-green" />
                        <div>
                          <h4 className="font-medium">Two-Factor Authentication</h4>
                          <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                        </div>
                      </div>
                      <Button variant="outline">Enable</Button>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Mail className="h-5 w-5 text-blockchain-blue" />
                        <div>
                          <h4 className="font-medium">Email Notifications</h4>
                          <p className="text-sm text-muted-foreground">Receive updates about your account</p>
                        </div>
                      </div>
                      <Button variant="outline">Configure</Button>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Eye className="h-5 w-5 text-harvest-amber" />
                        <div>
                          <h4 className="font-medium">Privacy Settings</h4>
                          <p className="text-sm text-muted-foreground">Control your data visibility</p>
                        </div>
                      </div>
                      <Button variant="outline">Manage</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="certifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Award className="h-5 w-5" />
                    <span>Certifications & Credentials</span>
                  </CardTitle>
                  <CardDescription>
                    View and manage your professional certifications and credentials
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    {profile.certifications.map((cert, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Award className="h-5 w-5 text-trust-green" />
                          <div>
                            <h4 className="font-medium">{cert}</h4>
                            <p className="text-sm text-muted-foreground">Verified certification</p>
                          </div>
                        </div>
                        <Badge className="bg-trust-green text-white">Active</Badge>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <Button variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Certification
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
};
