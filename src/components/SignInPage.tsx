const SignInPage: React.FC = () => {
  const location = useLocation();
  const isTransitioning = location.state?.transitioning;

  React.useEffect(() => {
    // Clear the transition state from history
    if (isTransitioning) {
      window.history.replaceState({}, document.title);
    }
  }, [isTransitioning]);

  return (
    <div className={`min-h-screen bg-black ${isTransitioning ? 'fade-in' : ''}`}>
      {/* Your signin page content */}
    </div>
  );
}; 