/* ACTIONS NAMES */
export const LOAD_GEOMETRIES = 'GEOMIMPORT:LOAD_GEOMETRIES';
export const LOADED_GEOMETRIES = 'GEOMIMPORT:LOADED_GEOMETRIES';
export const LOAD_ERROR = 'GEOMIMPORT:LOAD_ERROR';

/* ACTIONS FUNCTIONS */

export const loadGeometries = (features) => {
    return {
        type: LOAD_GEOMETRIES,
        features
    };
};

export const loadedGEOMETRIES = (payload) => {
    return {
        type: LOADED_GEOMETRIES,
        payload
    };
};

export const loadError = (error) => {
    return {
        type: LOAD_ERROR,
        error
    };
};
