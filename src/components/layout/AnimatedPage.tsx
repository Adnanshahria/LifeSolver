import { useLocation } from "react-router-dom";

export function AnimatedPage({ children }: { children: React.ReactNode }) {
    const location = useLocation();

    return (
        <div key={location.pathname} className="page-enter" style={{ width: "100%", minHeight: "100%" }}>
            {children}
        </div>
    );
}
