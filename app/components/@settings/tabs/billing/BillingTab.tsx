import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';

const BillingTab = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#222B45] dark:text-white">Billing & Subscription</h2>
        <p className="text-[#8F9BB3] dark:text-gray-400 mt-1">
          Manage your subscription, payment methods, and billing history
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Your current subscription plan and details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-[#F7F9FC] dark:bg-gray-800 rounded-lg border border-[#E4E9F2] dark:border-gray-700">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-[#3366FF]">Free Plan</h3>
                <p className="text-sm text-[#8F9BB3] dark:text-gray-400 mt-1">Basic features and functionality</p>
              </div>
              <div className="bg-[#3366FF]/10 text-[#3366FF] px-3 py-1 rounded-full text-sm font-medium">
                Active
              </div>
            </div>
            
            <div className="mt-4 space-y-2">
              <div className="flex items-center">
                <div className="i-ph:check-circle-fill text-green-500 mr-2" />
                <span className="text-sm">Basic AI features</span>
              </div>
              <div className="flex items-center">
                <div className="i-ph:check-circle-fill text-green-500 mr-2" />
                <span className="text-sm">Standard support</span>
              </div>
              <div className="flex items-center">
                <div className="i-ph:check-circle-fill text-green-500 mr-2" />
                <span className="text-sm">Limited cloud storage</span>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline">View Details</Button>
          <Button>Upgrade Plan</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>Manage your payment methods</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="i-ph:credit-card-duotone h-12 w-12 mx-auto text-[#8F9BB3] mb-2" />
            <p className="text-[#8F9BB3] dark:text-gray-400">No payment methods added yet</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full">Add Payment Method</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>View your recent invoices and transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="i-ph:receipt-duotone h-12 w-12 mx-auto text-[#8F9BB3] mb-2" />
            <p className="text-[#8F9BB3] dark:text-gray-400">No billing history available</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full">View All Transactions</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default BillingTab;