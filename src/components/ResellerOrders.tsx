import React from 'react';
import { Order } from '../types';
import { PackageCheck, TrendingUp, Truck, Clock } from 'lucide-react';

interface ResellerOrdersProps {
  orders: Order[];
}

export function ResellerOrders({ orders }: ResellerOrdersProps) {
  const totalEarnings = orders.reduce((acc, order) => acc + (order.totalMarginEarned || 0), 0);

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      {/* Earnings Summary Card */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-6 shadow-xl flex items-center justify-between">
        <div>
          <span className="text-xs text-emerald-200 uppercase font-bold tracking-wider">Total Reseller Earnings</span>
          <div className="text-3xl font-black mt-1">₹{totalEarnings}</div>
          <p className="text-xs text-emerald-100 mt-1">Earned from {orders.length} successful customer orders</p>
        </div>
        <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
          <TrendingUp className="w-8 h-8 text-yellow-300" />
        </div>
      </div>

      <h3 className="text-lg font-bold text-gray-800">My Reselling Orders</h3>

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500 shadow-sm">
          <PackageCheck className="w-16 h-16 mx-auto text-gray-300 mb-3" />
          <p className="font-semibold text-base">No orders placed yet</p>
          <p className="text-xs text-gray-400 mt-1">Share catalog products with your customers and place orders to track earnings here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100 text-xs">
                <div>
                  <span className="font-bold text-gray-900 text-sm">Order ID: {order.id}</span>
                  <span className="text-gray-400 ml-2">({new Date(order.createdAt).toLocaleDateString()})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-50 text-emerald-700 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5" />
                    <span>Margin Earned: +₹{order.totalMarginEarned}</span>
                  </span>
                  <span className="bg-rose-50 text-rose-700 font-bold px-2.5 py-1 rounded-full">
                    {order.status}
                  </span>
                </div>
              </div>

              {/* Customer Details */}
              <div className="bg-gray-50 p-3 rounded-xl text-xs space-y-1">
                <div className="font-bold text-gray-800">Customer: {order.customerName} ({order.customerPhone})</div>
                <div className="text-gray-600">Address: {order.customerAddress}, {order.city} - {order.pincode}</div>
                <div className="text-gray-500">Payment: {order.paymentMethod}</div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-xs">
                    <img src={item.product.image} alt="" className="w-12 h-14 object-cover rounded-lg shrink-0" referrerPolicy="no-referrer" />
                    <div className="flex-1">
                      <div className="font-bold text-gray-800 line-clamp-1">{item.product.title}</div>
                      <div className="text-gray-500">Size: {item.selectedSize} | Qty: {item.quantity}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-950">₹{item.resellPrice}</div>
                      <div className="text-[11px] text-emerald-600 font-semibold">+₹{item.resellPrice - item.product.wholesalePrice} profit</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
