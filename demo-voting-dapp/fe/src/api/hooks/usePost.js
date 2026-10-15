import { useState } from "react";
import axios from 'axios';

export const usePost = () => {
  const [isLoading, setIsLoading] = useState(false);

  const postData = async (path, body) => {
    setIsLoading(true);

    try{ 
        const response = await axios.post(path, body, {
            headers: {
                "Content-Type": "application/json"
            },
            withCredentials: true
        });
        return {ok: true, body: response.data};
    } catch (err) {
        return {ok: false, body: err.response.data};
    } finally {
        setIsLoading(false);
    }
  };

  return { postData, isLoading};
};