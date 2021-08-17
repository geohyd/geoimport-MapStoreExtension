/* eslint-disable */
/* REQUIREMENTS */
const assign = require('object-assign');
import { LOADED_GEOMETRIES, LOAD_ERROR } from './actions';

/* REDUCERS CASE */
export default function(state = {}, action) {
    switch (action.type) {
        case LOADED_GEOMETRIES:
            return assign({}, state, {
                text: action.payload
            });
        case LOAD_ERROR:
            return assign({}, state, {
                error: action.error
            });
        default:
            return state;
    }
}
