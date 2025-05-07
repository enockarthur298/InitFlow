import { useNavigate } from '@remix-run/react';
import { motion } from 'framer-motion';

export default function ThankYouPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mx-auto h-24 w-24 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <div className="i-ph:check-bold text-5xl text-green-600 dark:text-green-300" />
          </div>
          
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            Thank You for Your Purchase!
          </h2>
          
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Your subscription has been successfully activated. You now have access to all Pro features.
          </p>
          
          <div className="mt-8">
            <button
              onClick={() => navigate('/')}
              className="w-full px-4 py-3 bg-gradient-to-r from-[#3366FF] to-[#7B61FF] text-white rounded-md hover:opacity-90 transition-opacity"
            >
              Go to Dashboard
            </button>
            
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              If you have any questions, please contact our support team.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}