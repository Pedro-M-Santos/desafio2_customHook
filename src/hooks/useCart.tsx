import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    let cartTemp = [...cart] //easy to handle temporary array
    const productIndex = cartTemp.map(prod=>prod.id).indexOf(productId) 

    try {
      const query = await api.get('/stock')
      const stock:Stock[] = query.data //fetching stock data
      const response = await api.get(`/products/${productId}`) //search for prod to be added
      const desiredProduct = response.data

      const productInStock = stock.find(prod=>prod.id===productId) //Find specific product in stock
      const productPrevAmount = productIndex === -1? 0 : cartTemp[productIndex].amount

      if(productInStock && productInStock.amount > productPrevAmount){
        if(productIndex===-1){ //First time adding this product
          cartTemp.push({...desiredProduct,amount:1})
        }else{//Product's been chosen already
          cartTemp[productIndex].amount += 1
        }
        setCart(cartTemp)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartTemp)) 
      }
      else{
        toast.error('Quantidade solicitada fora de estoque')
      }
    } catch(error) {
      if(error.message)
        toast.error('Erro na adição do produto')
      toast.error(error.message)
    }
  };

  const removeProduct = (productId: number) => {
    let cartTemp = [...cart]// easy to handle temporary array
    try {
      if(!cartTemp.find(prod=>prod.id!==productId))
        throw new Error("Erro na remoção do produto")
      cartTemp = cartTemp.filter(prod=>prod.id!==productId)
      setCart([...cartTemp])
      if(cartTemp.length>0)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartTemp))
      else
        localStorage.removeItem('@RocketShoes:cart')
    } catch(error) {
      if(error.response) {
        toast.error("Erro na remoção do produto");
      }
    
      toast.error(error.message)
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const query = await api.get('/stock')
      const stock:Stock[] = query.data //fetching stock data
      const productInStock = stock.find(prod=>prod.id===productId)
      if(productInStock && (productInStock.amount<amount)){// Not enough in stock
        throw new Error()
      }
      let cartTemp = cart //easy to handle temporary array
      const productIndex = cartTemp.map(prod=>prod.id).indexOf(productId)
      cartTemp[productIndex].amount = amount
      setCart([...cartTemp])
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartTemp))

    } catch(error) {
      toast.error('Erro na alteração da quantidade do produto')
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
