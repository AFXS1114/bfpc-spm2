import React, { createContext, useState, useContext } from 'react';

const RecordPriceContext = createContext();

export const RecordPriceProvider = ({ children }) => {
  const [isModalVisible, setModalVisible] = useState(false);

  const showModal = () => setModalVisible(true);
  const hideModal = () => setModalVisible(false);

  return (
    <RecordPriceContext.Provider value={{ isModalVisible, showModal, hideModal }}>
      {children}
    </RecordPriceContext.Provider>
  );
};

export const useRecordPrice = () => {
  const context = useContext(RecordPriceContext);
  if (!context) {
    throw new Error('useRecordPrice must be used within a RecordPriceProvider');
  }
  return context;
};
