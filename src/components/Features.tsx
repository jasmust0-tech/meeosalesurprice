import React from 'react';
import { RotateCcw, Award } from 'lucide-react';

export function Features() {
  return (
    <div className="bg-[#f8eef8] px-3 py-1 border-b border-gray-100">
      {/* Slim Value Props Bar with Animated Rotating Border Line */}
      <div className="mobile-value-props !my-0 !w-full shadow-xs">
        <div className="border-rotator"></div>
        <div className="mobile-value-props-inner">
          
          {/* 1. 7 Days Easy Return */}
          <div className="value-item">
            <img
              className="value-icon"
              src="https://images.meesho.com/images/value_props/return_new.png"
              alt="7 Days Easy Return"
            />
            <div className="value-text">
              7 Days<br />
              Easy Return
            </div>
          </div>

          {/* 2. Extra Savings */}
          <div className="value-item">
            <img
              className="value-icon"
              src="https://www.meesho.com/assets/Icons/cod.svg"
              alt="Extra Savings"
            />
            <div className="value-text">
              Extra<br />
              Savings
            </div>
          </div>

          {/* 3. Lowest Price */}
          <div className="value-item">
            <img
              className="value-icon"
              src="https://www.meesho.com/assets/Icons/lowest-price.svg"
              alt="Lowest Price"
            />
            <div className="value-text">
              Lowest<br />
              Price
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
