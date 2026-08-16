import React from 'react';
import { Package, Plus } from 'lucide-react';

export const InventoryModule: React.FC = () => {
  const stockItems = [
    { id: 'inv-1', name: 'A4 Printing Paper reams', category: 'Stationery', quantity: 120, unit: 'Reams', reorderLevel: 20 },
    { id: 'inv-2', name: 'Whiteboard Marker Pens (Black)', category: 'Stationery', quantity: 450, unit: 'Boxes', reorderLevel: 50 },
    { id: 'inv-3', name: 'Laboratory Chemicals (Copper Sulphate)', category: 'Science Lab', quantity: 15, unit: 'Kg', reorderLevel: 5 },
    { id: 'inv-4', name: 'Football Match Balls', category: 'Sports Dept', quantity: 12, unit: 'Pieces', reorderLevel: 4 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2 font-serif">
            <Package className="w-5 h-5 text-emerald-400" />
            Stores & Inventory Management
          </h2>
          <p className="text-xs text-slate-400">
            Masaba Secondary School Stores • Consumables, stationeries & laboratory reagents
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-sans font-bold border-b border-slate-800">
              <tr>
                <th className="p-3.5">Item Description</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">In Stock Quantity</th>
                <th className="p-3.5">Reorder Threshold</th>
                <th className="p-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {stockItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/40">
                  <td className="p-3.5 font-bold text-white">{item.name}</td>
                  <td className="p-3.5 text-slate-300">{item.category}</td>
                  <td className="p-3.5 font-mono text-emerald-400 font-bold">{item.quantity} {item.unit}</td>
                  <td className="p-3.5 font-mono text-slate-400">{item.reorderLevel} {item.unit}</td>
                  <td className="p-3.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300">
                      In Stock
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
