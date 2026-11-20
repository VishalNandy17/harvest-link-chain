import { 
  Boxes, 
  CircleUserRound, 
  ExternalLink, 
  LayoutDashboard, 
  Leaf, 
  LogOut, 
  Tractor, 
  Truck, 
  Store, 
  UserCheck, 
  ShieldAlert,
  ArrowRightLeft
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

const homeForRole = (role?: UserRole | null) => {
  if (role === UserRole.FARMER) return "/dashboards/farmer";
  if (role === UserRole.DISTRIBUTOR) return "/dashboards/distributor";
  if (role === UserRole.RETAILER) return "/dashboards/retailer";
  if (role === UserRole.CONSUMER) return "/dashboards/consumer";
  if (role === UserRole.ADMIN) return "/dashboards/admin";
  return "/pds";
};

export function DashboardFrame({ children }: { children: React.ReactNode }) {
  const { user, userRole, signOut, switchRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const home = homeForRole(userRole);

  const links = [
    { label: "Active Overview", to: home, icon: LayoutDashboard },
    { label: "PDS Operations Hub", to: "/pds", icon: Boxes },
    { label: "Farmer (Lot & QR)", to: "/dashboards/farmer", icon: Tractor },
    { label: "Distributor (Transit)", to: "/dashboards/distributor", icon: Truck },
    { label: "Retailer (FPS Store)", to: "/dashboards/retailer", icon: Store },
    { label: "Consumer (Verify)", to: "/dashboards/consumer", icon: UserCheck },
    { label: "Admin Oversight", to: "/dashboards/admin", icon: ShieldAlert },
  ];

  const initials = user?.email?.slice(0, 1).toUpperCase() || "H";

  const handleRoleChange = async (newRole: string) => {
    try {
      const res = await switchRole(newRole as UserRole);
      if (res.error) {
        toast({
          title: "Role switch failed",
          description: res.error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Active Role Switched",
          description: `You are now operating as ${newRole.toUpperCase()}.`,
        });
        navigate(homeForRole(newRole as UserRole));
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="hl-workspace">
      <aside className="hl-sidebar">
        <Link to="/" className="hl-brand">
          <span className="hl-brand-mark"><Leaf size={18} /></span>
          <span>harvest<span>link</span></span>
        </Link>

        {/* Role Switcher in Sidebar */}
        <div className="px-3 py-2 bg-slate-900/60 rounded-lg mx-2 my-2 border border-slate-700/60">
          <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-slate-400 mb-1.5">
            <ArrowRightLeft size={12} className="text-green-400" />
            <span>SWITCH ACTIVE ROLE</span>
          </div>
          <Select value={userRole || UserRole.CONSUMER} onValueChange={handleRoleChange}>
            <SelectTrigger className="w-full h-8 text-xs bg-slate-800 border-slate-600 text-slate-200">
              <SelectValue placeholder="Select Role" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
              <SelectItem value={UserRole.FARMER}>Farmer / Mandi</SelectItem>
              <SelectItem value={UserRole.DISTRIBUTOR}>Transporter / Depot</SelectItem>
              <SelectItem value={UserRole.RETAILER}>Retailer (Fair Price Shop)</SelectItem>
              <SelectItem value={UserRole.CONSUMER}>Beneficiary / Consumer</SelectItem>
              <SelectItem value={UserRole.PROCUREMENT}>Procurement Officer</SelectItem>
              <SelectItem value={UserRole.WAREHOUSE}>Warehouse Manager</SelectItem>
              <SelectItem value={UserRole.AUDITOR}>Vigilance Auditor</SelectItem>
              <SelectItem value={UserRole.ADMIN}>Platform Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="hl-workspace-label">ROLE WORKSPACES</div>
        <nav aria-label="Workspace navigation" className="hl-workspace-nav">
          {links.map(({ label, to, icon: Icon }) => (
            <Link 
              className={location.pathname === to ? "active" : ""} 
              key={label} 
              to={to}
            >
              <Icon size={16} />
              <span>{label}</span>
              {location.pathname === to && <span className="hl-nav-pip" />}
            </Link>
          ))}
        </nav>

        <div className="hl-sidebar-grow" />
        <Link className="hl-sidebar-public" to="/">
          <ExternalLink size={15} /> Public site
        </Link>
        <button 
          className="hl-sidebar-signout" 
          onClick={async () => { await signOut(); navigate("/login", { replace: true }); }}
        >
          <LogOut size={15} /> Sign out
        </button>

        <div className="hl-sidebar-profile">
          <span>{initials}</span>
          <div>
            <strong>{user?.email?.split("@")[0] || "Your account"}</strong>
            <small>{String(userRole || "member").replaceAll("_", " ").toLowerCase()}</small>
          </div>
          <CircleUserRound size={17} />
        </div>
      </aside>

      <div className="hl-workspace-main">
        <header className="hl-workspace-top">
          <div>
            <span>HARVESTLINK</span>
            <b>/</b>
            <strong>{String(userRole || "workspace").replaceAll("_", " ").toLowerCase()}</strong>
          </div>
          <div className="hl-top-profile">
            <span className="hl-online-mark" />
            Live Role: <b className="ml-1 uppercase text-xs text-green-700">{userRole || "CONSUMER"}</b>
            <span className="hl-top-avatar ml-2">{initials}</span>
          </div>
        </header>

        <div className="hl-workspace-content">{children}</div>
      </div>
    </div>
  );
}
