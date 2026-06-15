import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <Helmet>
        <title>הדף לא נמצא (404) | סדצקי הנדסה</title>
        <meta
          name="description"
          content="הדף המבוקש לא נמצא באתר. חזור לעמוד הבית של מהנדס המבנים איליה סדצקי לאישורים הנדסיים, פתיחת קירות, פרגולות וחוות דעת."
        />
        <meta name="robots" content="noindex, follow" />
      </Helmet>
      <div className="text-center">
        <h1 className="t-404-stack t-404-title">404</h1>
        <p className="t-404-lead text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
