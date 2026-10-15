import { useEffect, useState } from "react";
import axios from 'axios';

export const useGet = () => {
  const [isLoading, setIsLoading] = useState(true);

  const getData = async (path) => {
    setIsLoading(true);
    try {
      const response = await axios.get(path);
      return {ok:true, data: response.data};
    } catch (err) {
      return {ok:false, data: err.response.data}
    } finally {
      setIsLoading(false);
    }
  };

  return { getData, isLoading };
};