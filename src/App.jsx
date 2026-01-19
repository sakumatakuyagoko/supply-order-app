import { useState } from 'react';
import ProductList from './components/ProductList';
import CartSidebar from './components/CartSidebar';
import OrderConfirmationModal from './components/OrderConfirmationModal';
import { useProducts } from './hooks/useProducts';
import { useCart } from './hooks/useCart';
import { submitOrder } from './services/api';

function App() {
  const { products, loading, error } = useProducts();
  const { items, addToCart, updateQuantity, removeFromCart, clearCart, totalAmount } = useCart();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInitiateOrder = (employee) => {
    setCurrentEmployee(employee);
    setIsModalOpen(true);
  };

  const handleConfirmOrder = async () => {
    if (!currentEmployee) return;

    setIsSubmitting(true);
    try {
      // Use ID if available, otherwise name (or both combined)
      const ordererInfo = `${currentEmployee.name} (${currentEmployee.id})`;
      const result = await submitOrder(items, ordererInfo);

      if (result.success) {
        alert('注文が完了しました！');
        clearCart();
        setIsModalOpen(false);
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
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Main Content Area */}
      <main className="flex-grow flex flex-col h-full overflow-hidden">
        <header className="bg-white shadow-sm z-10 p-4">
          <h1 className="text-2xl font-bold text-gray-800">
            🏭 工場備品発注システム
          </h1>
        </header>

        <div className="flex-grow p-4 overflow-hidden">
          <ProductList products={products} onAddToCart={addToCart} />
        </div>
      </main>

      {/* Cart Sidebar */}
      <aside className="w-[400px] flex-shrink-0 h-full z-20 shadow-2xl">
        <CartSidebar
          cartItems={items}
          totalAmount={totalAmount}
          onUpdateQuantity={updateQuantity}
          onRemove={removeFromCart}
          onClearCart={clearCart}
          onInitiateOrder={handleInitiateOrder}
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
