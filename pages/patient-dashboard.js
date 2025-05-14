import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { 
  Menu, 
  X, 
  Calendar, 
  Settings, 
  Clock, 
  Bell, 
  LogOut,
  User,
  ChevronRight
} from "lucide-react";

export default function PatientDashboard() {
    const [user, setUser] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [phoneMissing, setPhoneMissing] = useState(false);
    const [notifications, setNotifications] = useState([
        { id: 1, message: "Thank you for using our application", type: "reminder" },
        { id: 2, message: "Please complete registration to update your profile  ", type: "action" }
    ]);
    const router = useRouter();

    useEffect(() => {
        const loggedInUser = JSON.parse(localStorage.getItem('user'));
        if (loggedInUser) {
            setUser(loggedInUser);
            if (!loggedInUser.phoneNumber || loggedInUser.phoneNumber.trim() === "") {
                setPhoneMissing(true);
            }
        }
    }, [router]);

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    const handleLogout = () => {
        localStorage.removeItem("user");
        router.push("/login");
    };

    const handleNavigation = (path) => {
        if (phoneMissing && path.includes("appointments")) {
            alert("Please update your phone number in settings before making a booking.");
            router.push("/patient-settings");
            return;
        }
        router.push(path);
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Navbar */}
            <nav className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">

                        {/* Logo and App Name */}
                        <div className="flex items-center space-x-3">
                                <img
                                    src="/logoMain.png" 
                                    alt="App Logo"
                                    width={48}
                                    height={48}
                                />
                            <span className="text-xl font-semibold text-teal-600 tracking-wide">
                                Health Booking System
                            </span>
                        </div>

                {/* Desktop Menu */}
                        <div className="hidden md:flex items-center space-x-4">
                            <div className="flex items-center space-x-2 text-slate-700">
                                <User size={20} />
                                <span>{user.name}</span>
                            </div>
                            <button 
                                onClick={handleLogout}
                                className="flex items-center space-x-2 text-slate-600 hover:text-red-600 transition-colors"
                            >
                                <LogOut size={20} />
                                <span>Logout</span>
                    </button>
                </div>

                {/* Mobile Menu Button */}
                        <div className="md:hidden flex items-center">
                            <button onClick={() => setMenuOpen(!menuOpen)} className="text-gray-600">
                                {menuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
                        </div>
                    </div>
                </div>

            {/* Mobile Menu */}
            {menuOpen && (
                    <div className="md:hidden border-t border-slate-200 bg-white">
                        <div className="px-4 py-3 space-y-3">
                            <div className="flex items-center space-x-2 text-slate-700">
                                <User size={20} />
                                <span>{user.name}</span>
                            </div>
                            <button 
                                onClick={handleLogout}
                                className="flex items-center space-x-2 text-slate-600 hover:text-red-600 w-full"
                            >
                                <LogOut size={20} />
                                <span>Logout</span>
                    </button>
                        </div>
                    </div>
                )}
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome Section */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-900">{getGreeting()}, {user.name}!</h2>
                    <p className="mt-1 text-slate-600">Welcome to your health dashboard</p>
                </div>

                {/* Warning Banner */}
                {phoneMissing && (
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center space-x-3">
                        <Bell className="text-amber-500" size={20} />
                        <p className="text-amber-800">
                            Please update your phone number in settings to enable appointment booking.
                    </p>
                    </div>
                )}

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <button
                        onClick={() => handleNavigation("./appointments/general-checkup")}
                        className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-teal-500 transition-all group"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-teal-50 rounded-lg group-hover:bg-teal-100 transition-colors">
                                    <Calendar className="text-teal-600" size={24} />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-semibold text-slate-900">Book Appointment</h3>
                                    <p className="text-sm text-slate-600">Schedule your next visit</p>
                                </div>
                            </div>
                            <ChevronRight className="text-slate-400 group-hover:text-teal-500 transition-colors" size={20} />
                        </div>
                    </button>

                    <button
                        onClick={() => handleNavigation("/patient-settings")}
                        className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-teal-500 transition-all group"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-slate-50 rounded-lg group-hover:bg-slate-100 transition-colors">
                                    <Settings className="text-slate-600" size={24} />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-semibold text-slate-900">Settings</h3>
                                    <p className="text-sm text-slate-600">Manage your profile</p>
                                </div>
                            </div>
                            <ChevronRight className="text-slate-400 group-hover:text-teal-500 transition-colors" size={20} />
                        </div>
                    </button>

                        <button
                        onClick={() => handleNavigation("/booking-history")}
                        className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-teal-500 transition-all group"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-slate-50 rounded-lg group-hover:bg-slate-100 transition-colors">
                                    <Clock className="text-slate-600" size={24} />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-semibold text-slate-900">Booking History</h3>
                                    <p className="text-sm text-slate-600">View past appointments</p>
                                </div>
                            </div>
                            <ChevronRight className="text-slate-400 group-hover:text-teal-500 transition-colors" size={20} />
                        </div>
                        </button>
                </div>

                {/* Notifications Section */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-200">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-900">Recent Notifications</h3>
                            <Bell className="text-slate-400" size={20} />
                        </div>
                    </div>
                    <div className="divide-y divide-slate-200">
                        {notifications.map((notification) => (
                            <div key={notification.id} className="p-4 hover:bg-slate-50 transition-colors">
                                <div className="flex items-start space-x-3">
                                    <div className={`p-2 rounded-lg ${
                                        notification.type === 'reminder' ? 'bg-teal-50' : 'bg-amber-50'
                                    }`}>
                                        {notification.type === 'reminder' ? (
                                            <Calendar className="text-teal-600" size={16} />
                                        ) : (
                                            <Bell className="text-amber-600" size={16} />
                                        )}
                                    </div>
                                    <p className="text-slate-700">{notification.message}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
