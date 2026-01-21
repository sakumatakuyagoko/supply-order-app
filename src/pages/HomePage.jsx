import React from 'react';
import { useNavigate } from 'react-router-dom';

function HomePage() {
    const navigate = useNavigate();

    const menuItems = [
        {
            title: '新規オーダー',
            subtitle: '備品の発注はこちら',
            icon: (
                <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
            path: '/order',
            color: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
            active: true
        },
        {
            title: '納入受付',
            subtitle: 'QRコードをスキャンして検品',
            icon: (
                <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
            ),
            path: '/receive',
            color: 'bg-green-50 hover:bg-green-100 border-green-200',
            active: true
        },
        {
            title: '発注履歴',
            subtitle: '過去の注文を確認',
            icon: (
                <svg className="w-12 h-12 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            path: '/history',
            color: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
            active: false // Coming soon
        },
        {
            title: 'アイテム登録・変更',
            subtitle: '商品の追加や編集',
            icon: (
                <svg className="w-12 h-12 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
            ),
            path: '/admin/products',
            color: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
            active: false // Coming soon
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-blue-600 shadow-sm z-10 p-4 flex justify-between items-center h-20">
                <h1 className="text-2xl font-bold text-white flex items-center gap-4">
                    <img src="/company_icon.png" alt="Company Logo" className="h-10 w-auto bg-white p-1 rounded flex-shrink-0" />
                    <div className="flex flex-col">
                        <span>消耗・備品オーダーシステム</span>
                        <span className="text-[10px] font-normal opacity-80">Ver 1.0 (2026/01/21更新)</span>
                    </div>
                </h1>
                <img src="/factory_icon.png" alt="Factory Logo" className="h-12 w-auto object-contain" />
            </header>

            <main className="flex-grow container mx-auto px-4 py-8 max-w-4xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {menuItems.map((item, index) => (
                        <button
                            key={index}
                            onClick={() => item.active ? navigate(item.path) : alert('この機能は現在準備中です')}
                            className={`
                group relative flex items-center p-6 rounded-2xl border-2 transition-all duration-300 shadow-sm hover:shadow-md text-left
                ${item.color} ${!item.active ? 'opacity-60 cursor-not-allowed grayscale' : 'cursor-pointer'}
              `}
                        >
                            <div className="flex-shrink-0 bg-white p-4 rounded-xl shadow-sm group-hover:scale-110 transition-transform duration-300">
                                {item.icon}
                            </div>
                            <div className="ml-6 flex-grow">
                                <h2 className="text-xl font-bold text-gray-800 mb-1">{item.title}</h2>
                                <p className="text-gray-600 text-sm">{item.subtitle}</p>
                            </div>
                            {item.active && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            )}
                            {!item.active && (
                                <div className="absolute top-2 right-2 bg-gray-200 text-gray-500 text-xs px-2 py-1 rounded-full font-bold">
                                    準備中
                                </div>
                            )}
                        </button>
                    ))}
                </div>

                <div className="mt-12 text-center text-gray-400 text-sm">
                    &copy; 2026 Goko Factory. All rights reserved.
                </div>
            </main>
        </div>
    );
}

export default HomePage;
