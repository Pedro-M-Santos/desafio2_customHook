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
    let cartTemp = cart //easy to handle temporary array
    let desiredAmount = null; // amount to be added

    try {
      //Fetching product specs in stock
      const productInStock:Stock = (await api.get(`/stock/${productId}`)).data
      //Trying to find this product in the cart 
      const productIndex = cartTemp.map(prod=>prod.id).indexOf(productId)
      //Stablishing amount to be added based on product's first appearence
      desiredAmount = productIndex === -1 ? 1: cartTemp[productIndex].amount + 1
      //if there is enough in stock
      if(productInStock.amount >= desiredAmount){
        if(productIndex===-1){ //First time adding this product
          const desiredProduct = (await api.get(`/products/${productId}`)).data
          cartTemp.push({...desiredProduct,amount:desiredAmount})
        }else{ //Product already been chosen
          cartTemp[productIndex].amount = desiredAmount
        }
        setCart([...cartTemp])
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart)) 
      }
      //Not enough in stock
      else{
        throw new Error('Quantidade solicitada fora de estoque')
      }
    } 
    catch(error) {
      toast.error(error.message)
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    let cartTemp = cart// easy to handle temporary array
    try {
      if((cartTemp.filter(prod=>prod.id===productId)).length > 0){
        cartTemp = cartTemp.filter(prod=>prod.id!==productId)
        setCart([...cartTemp])
        if(cartTemp.length>0)
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartTemp))
        else
          localStorage.removeItem('@RocketShoes:cart')
      }else{ //This product does not exist in our DB
        throw new Error('Erro na remoção do produto')
      }
    }
    catch(error) {
      toast.error(error.message)
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    let cartTemp = cart //easier-to-handle cart copy
    try {
      if(amount<=0)
        throw new Error('Erro na alteração da quantidade do produto')
      //If this product is actually in the cart
      if((cartTemp.filter(prod=>prod.id===productId)).length > 0){
      //Fetching product specs in stock
      const productInStock:Stock = (await api.get(`/stock/${productId}`)).data
      // Not enough in stock
      if(productInStock && (productInStock.amount<amount))
        throw new Error('Quantidade solicitada fora de estoque')
      //Finding product's position in array
      const productIndex = cartTemp.map(prod=>prod.id).indexOf(productId)
      //Updating its amount
      cartTemp[productIndex].amount = amount
      //Updating cart state
      setCart([...cartTemp])
      //Storing cart in localStorage
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
      }
      else{ //This product does not exist in our DB
        throw new Error('Erro na alteração de quantidade do produto')
      }   
    } catch(error) {
      toast.error(error.message)
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
