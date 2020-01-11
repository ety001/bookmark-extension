import * as types from './mutation-types';

export const setStatus = ({ commit }, payload) => {
  commit(types.UPDATE_STATUS, payload);
};
