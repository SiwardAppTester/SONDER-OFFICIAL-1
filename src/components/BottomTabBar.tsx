import { Link, useLocation } from "react-router-dom";
import { Home as HomeIcon, User, PlusSquare } from "lucide-react";

const BottomTabBar: React.FC = () => {
  const location = useLocation();
  return (
    <nav className="bottom-nav bg-gray-800 text-white p-4 flex justify-around items-center">
      <Link
        to="/"
        className={`text-2xl ${location.pathname === "/" ? "text-blue-400" : ""}`}
      >
        <HomeIcon size={24} />
      </Link>
      <Link
        to="/add-post"
        className={`text-2xl ${location.pathname === "/add-post" ? "text-blue-400" : ""}`}
      >
        <PlusSquare size={24} />
      </Link>
      <Link
        to="/profile"
        className={`text-2xl ${location.pathname === "/profile" ? "text-blue-400" : ""}`}
      >
        <User size={24} />
      </Link>
    </nav>
  );
};

export default BottomTabBar;
