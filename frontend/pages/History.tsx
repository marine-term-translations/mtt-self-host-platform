import React from 'react';
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle, Edit2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HistoryItem {
  id: number;
  term: string;
  action: 'Created' | 'Edited' | 'Reviewed';
  lang: string;
  status: 'Approved' | 'Pending' | 'Rejected';
  date: string;
  details: string;
}

const History: React.FC = () => {
  const mockHistory: HistoryItem[] = [
    { id: 1, term: "Water Turbidity", action: "Edited", lang: "EN", status: "Approved", date: "2023-10-25", details: "Added plain english definition" },
    { id: 2, term: "Bathyal zone", action: "Reviewed", lang: "FR", status: "Approved", date: "2023-10-24", details: "Verified technical accuracy" },
    { id: 3, term: "Salinity", action: "Created", lang: "NL", status: "Pending", date: "2023-10-22", details: "Initial translation submission" },
    { id: 4, term: "Anthropogenic debris", action: "Edited", lang: "ES", status: "Rejected", date: "2023-10-20", details: "Translation too literal" },
    { id: 5, term: "Dissolved oxygen", action: "Created", lang: "EN", status: "Approved", date: "2023-10-15", details: "Added comprehensive description" },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"><CheckCircle size={12} className="mr-1"/> Approved</span>;
      case 'Pending': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"><Clock size={12} className="mr-1"/> Pending</span>;
      case 'Rejected': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"><XCircle size={12} className="mr-1"/> Rejected</span>;
      default: return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/dashboard" className="inline-flex items-center text-slate-500 hover:text-marine-600 mb-6 transition-colors">
        <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-marine-100 dark:bg-marine-900 text-marine-600 dark:text-marine-400 rounded-lg">
          <Edit2 size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Contribution History</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">A timeline of your translations and edits.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Term</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Language</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Action</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Details</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {mockHistory.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{item.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{item.term}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{item.lang}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{item.action}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 truncate max-w-xs">{item.details}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(item.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
        <AlertCircle size={16} />
        <span>Only showing the last 30 days of activity.</span>
      </div>
    </div>
  );
};

export default History;