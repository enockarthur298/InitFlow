import { useState } from 'react';
import { useNavigate } from '@remix-run/react'; // Changed from react-router-dom to @remix-run/react
import { motion } from 'framer-motion';
import { Menu, X, Twitter, Github, Linkedin, ArrowRight, Code2, Wand2, Zap } from 'lucide-react';


export function Landing() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Function to navigate to the chat interface
  const navigateToChat = () => {
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Enhanced Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 py-4 px-4 md:px-8 shadow-sm">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-8">
            <div className="font-bold text-2xl text-blue-600">Bolt.DIY</div>
            <div className="hidden md:flex space-x-6">
              <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors">Features</a>
              <button 
                onClick={() => navigate('/pricing')} 
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                Pricing
              </button>
            </div>
          </div>
          
          <div className="hidden md:flex items-center space-x-4">
            <button 
              onClick={navigateToChat}
              className="text-sm font-medium px-4 py-2 rounded-md text-gray-700 hover:text-blue-600 transition-colors"
            >
              Log in
            </button>
            <button
              onClick={navigateToChat}
              className="text-sm font-medium px-5 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Get Started
            </button>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2">
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-100 shadow-md py-4 px-4">
            <div className="flex flex-col space-y-4">
              <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors py-2">Features</a>
              <button 
                onClick={() => navigate('/pricing')}
                className="text-gray-600 hover:text-blue-600 transition-colors py-2 text-left"
              >
                Pricing
              </button>
              <button 
                onClick={navigateToChat}
                className="text-sm font-medium px-4 py-2 rounded-md text-gray-700 hover:text-blue-600 transition-colors text-left"
              >
                Log in
              </button>
              <button
                onClick={navigateToChat}
                className="text-sm font-medium px-5 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors text-left"
              >
                Get Started
              </button>
            </div>
          </div>
        )}
      </nav>

      <div className="container mx-auto px-4 md:px-8">
        {/* Hero section with improved conversion elements */}
        <div className="py-20 md:py-32 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-block px-4 py-1 bg-blue-50 text-blue-600 rounded-full text-sm font-medium mb-6">
              AI-powered development environment
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Build web apps <span className="text-blue-600">with AI assistance</span>
            </h1>
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
              Bolt.DIY turns your ideas into fully functional applications. Develop, test, and deploy your projects all in one place with powerful AI assistance.
            </p>

            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <button
                onClick={navigateToChat}
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                Start Building <ArrowRight className="ml-2 h-4 w-4" />
              </button>
              <a 
                href="#demo"
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
              >
                See How It Works
              </a>
            </div>
            
            {/* Rest of the landing page content remains the same */}
            
            {/* Social proof with logos */}
            <div className="mt-16 text-center">
              <p className="text-sm uppercase tracking-wider text-gray-500 mb-6">Trusted by developers from</p>
              <div className="flex flex-wrap justify-center items-center gap-8 opacity-70">
                <img src="/images/logos/company1.svg" alt="Company 1" className="h-8" />
                <img src="/images/logos/company2.svg" alt="Company 2" className="h-8" />
                <img src="/images/logos/company3.svg" alt="Company 3" className="h-8" />
                <img src="/images/logos/company4.svg" alt="Company 4" className="h-8" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* App Demo Section */}
        <div id="demo" className="py-20 border-t border-gray-100">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">See Bolt.DIY in Action</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Watch how easy it is to build and deploy a complete web application in minutes.
              </p>
            </div>
            
            <div className="bg-gray-900 rounded-xl overflow-hidden shadow-2xl">
              <div className="aspect-w-16 aspect-h-9">
                <iframe 
                  src="https://www.youtube.com/embed/dQw4w9WgXcQ" 
                  title="Product Demo"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="py-20 border-t border-gray-100">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful Features</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Everything you need to build, test, and deploy your web applications.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <motion.div 
                whileHover={{ y: -5 }}
                className="bg-white p-8 rounded-xl shadow-sm border border-gray-100"
              >
                <div className="bg-blue-50 p-3 rounded-lg inline-block mb-4">
                  <Code2 className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">WebContainer Environment</h3>
                <p className="text-gray-600">
                  Full development environment in your browser. No installations required.
                </p>
              </motion.div>
              
              <motion.div 
                whileHover={{ y: -5 }}
                className="bg-white p-8 rounded-xl shadow-sm border border-gray-100"
              >
                <div className="bg-blue-50 p-3 rounded-lg inline-block mb-4">
                  <Wand2 className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">AI Assistance</h3>
                <p className="text-gray-600">
                  Get intelligent code suggestions and solutions powered by advanced AI models.
                </p>
              </motion.div>
              
              <motion.div 
                whileHover={{ y: -5 }}
                className="bg-white p-8 rounded-xl shadow-sm border border-gray-100"
              >
                <div className="bg-blue-50 p-3 rounded-lg inline-block mb-4">
                  <Zap className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">One-Click Deployment</h3>
                <p className="text-gray-600">
                  Deploy your applications to Netlify or Cloudflare with just a single click.
                </p>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Testimonials Section */}
        <div className="py-20 border-t border-gray-100">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">What Developers Say</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Join thousands of developers who are building with Bolt.DIY.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full mr-4"></div>
                  <div>
                    <h4 className="font-semibold">Sarah Johnson</h4>
                    <p className="text-gray-600 text-sm">Frontend Developer</p>
                  </div>
                </div>
                <p className="text-gray-700">
                  "Bolt.DIY has completely transformed my development workflow. I can prototype and deploy faster than ever before."
                </p>
              </div>
              
              <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full mr-4"></div>
                  <div>
                    <h4 className="font-semibold">Michael Chen</h4>
                    <p className="text-gray-600 text-sm">Full Stack Developer</p>
                  </div>
                </div>
                <p className="text-gray-700">
                  "The AI assistance is like having a senior developer by your side. It's helped me solve complex problems in minutes instead of hours."
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-20 border-t border-gray-100">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to build your next project?</h2>
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
              Join thousands of developers who are building amazing applications with Bolt.DIY.
            </p>
            <button
              onClick={() => navigate('/home')}
              className="inline-flex items-center justify-center px-8 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Get Started for Free <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-100 py-12">
        <div className="container mx-auto px-4 md:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="font-bold text-xl text-blue-600 mb-4">Bolt.DIY</div>
              <p className="text-gray-600 mb-4">
                Build, test, and deploy web applications with AI assistance.
              </p>
              <div className="flex space-x-4">
                <a href="https://twitter.com" className="text-gray-400 hover:text-blue-500">
                  <Twitter size={20} />
                </a>
                <a href="https://github.com" className="text-gray-400 hover:text-gray-900">
                  <Github size={20} />
                </a>
                <a href="https://linkedin.com" className="text-gray-400 hover:text-blue-700">
                  <Linkedin size={20} />
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="text-gray-600 hover:text-blue-600">Features</a></li>
                <li><a href="#" className="text-gray-600 hover:text-blue-600">Pricing</a></li>
                <li><a href="#" className="text-gray-600 hover:text-blue-600">Roadmap</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-600 hover:text-blue-600">Documentation</a></li>
                <li><a href="#" className="text-gray-600 hover:text-blue-600">Tutorials</a></li>
                <li><a href="#" className="text-gray-600 hover:text-blue-600">Blog</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-600 hover:text-blue-600">About</a></li>
                <li><a href="#" className="text-gray-600 hover:text-blue-600">Careers</a></li>
                <li><a href="#" className="text-gray-600 hover:text-blue-600">Contact</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-200 mt-12 pt-8 text-center text-gray-500 text-sm">
            <p>&copy; {new Date().getFullYear()} Bolt.DIY. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;