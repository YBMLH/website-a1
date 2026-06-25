import { createContext, useContext, useState, useCallback } from 'react';
import Modal from './Modal';

const ConfirmContext = createContext(null);
export const useConfirm = () => useContext(ConfirmContext);

// Promise-based confirmation dialog: `await confirm({ title, message })`.
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);

  const confirm = useCallback((opts) => new Promise((resolve) => {
    setState({ ...opts, resolve });
  }), []);

  const close = (result) => { state?.resolve(result); setState(null); };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <Modal
          title={state.title || 'Are you sure?'}
          onClose={() => close(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => close(false)}>Cancel</button>
              <button className={`btn ${state.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => close(true)}>
                {state.confirmText || 'Confirm'}
              </button>
            </>
          }
        >
          <p style={{ margin: 0 }}>{state.message}</p>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}
