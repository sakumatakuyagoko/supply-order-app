import { useState, useEffect } from 'react';
import ProductList from './components/ProductList';
import CartSidebar from './components/CartSidebar';
import OrderConfirmationModal from './components/OrderConfirmationModal';
import Toast from './components/Toast';
import { useProducts } from './hooks/useProducts';
import { useCart } from './hooks/useCart';
import { submitOrder } from './services/api';

function App() {
  const { products, loading, error } = useProducts();
  const { items, addToCart, updateQuantity, removeFromCart, clearCart, totalAmount, toggleUrgency } = useCart();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false); // New state for mobile cart
  const [toastMessage, setToastMessage] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);

  const handleAddToCart = (product) => {
    addToCart(product);
    setToastMessage(`${product.name} をカートに追加しました`);
    setIsAnimating(true);
    // Reset animation class after it plays
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleInitiateOrder = (employee) => {
    // ... existing methods
    setCurrentEmployee(employee);
    setIsModalOpen(true);
  };

  const handleConfirmOrder = async () => {
    if (!currentEmployee) return;

    setIsSubmitting(true);
    try {
      // Pass the full employee object to submitOrder
      const result = await submitOrder(items, currentEmployee);

      if (result.success) {
        alert('注文が完了しました！');
        clearCart();
        setIsModalOpen(false);
        setIsCartOpen(false); // Close cart on success
      } else {
        alert(`注文に失敗しました。\n詳細: ${result.message}`);
      }
    } catch (e) {
      console.error(e);
      alert(`エラーが発生しました。\n詳細: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        エラーが発生しました: {error.message}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden relative">
      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          onClose={() => setToastMessage('')}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col h-full overflow-hidden w-full">
        <header className="bg-blue-600 shadow-sm z-10 p-2 md:p-4 flex justify-between items-center h-16 md:h-20 transition-all">
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2 md:gap-4 overflow-hidden">
            {/* Mobile: Small logo (h-7) with thicc padding (p-1.5), PC: Normal (h-10) */}
            <img src="/company_icon.png" alt="Company Logo" className="h-7 md:h-10 w-auto bg-white p-1.5 md:p-1 rounded flex-shrink-0" />
            <span className="hidden md:inline">消耗・備品オーダー</span>
            <span className="md:hidden text-lg whitespace-nowrap">備品発注</span>
          </h1>
          <div className="flex items-center gap-3">
            {/* Mobile Cart Button: White if empty, Yellow if has items */}
            <button
              onClick={() => setIsCartOpen(true)}
              className={`md:hidden border-2 px-4 py-2 rounded-lg font-bold text-lg shadow-lg flex items-center gap-2 active:scale-95 transition-all
                ${items.length === 0
                  ? 'bg-white text-blue-600 border-blue-100'
                  : 'bg-yellow-400 text-black border-yellow-500 animate-pulse-slow'
                }
                ${isAnimating ? 'scale-110' : ''}
              `}
            >
              <svg className="w-6 h-6 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>{items.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </button>
            <img src="/factory_icon.png" alt="Logo" className="h-8 md:h-12 w-auto object-contain" />
          </div>
        </header>

        <div className="flex-grow p-4 overflow-hidden">
          <ProductList products={products} onAddToCart={handleAddToCart} />
        </div>
      </main>

      {/* Cart Sidebar - Responsive */}
      {/* Overlay for mobile */}
      {isCartOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsCartOpen(false)}
        />
      )}

      <aside className={`
        w-full md:w-[400px] flex-shrink-0 h-full z-40 shadow-2xl bg-white
        fixed md:static top-0 right-0 transition-transform duration-300 transform
        ${isCartOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
      `}>
        <CartSidebar
          cartItems={items}
          totalAmount={totalAmount}
          onUpdateQuantity={updateQuantity}
          onRemove={removeFromCart}
          onClearCart={clearCart}
          onInitiateOrder={handleInitiateOrder}
          onClose={() => setIsCartOpen(false)}
          onToggleUrgency={toggleUrgency}
        />
      </aside>

      {/* Confirmation Modal */}
      <OrderConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmOrder}
        employee={currentEmployee || { id: '', name: '' }}
        cartItems={items}
        totalAmount={totalAmount}
        isSubmitting={isSubmitting}
      />


    </div>
  );
}

export default App;
