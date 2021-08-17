/* eslint-disable */
/* REQUIREMENTS */
import * as Rx from 'rxjs';
// ACTIONS
import { LOAD_GEOMETRIES } from './actions';
import { TOGGLE_MODE, createNewFeatures, CLOSE_FEATURE_GRID} from 'mapstore2/web/client/actions/featuregrid';
// SELECTORS
const {describeSelector} = require('mapstore2/web/client/selectors/query');
// UTILS
const {findGeometryProperty} = require('mapstore2/web/client/utils/ogc/WFS/base');
const uuid = require('uuid');
import { lineToPolygon, combine } from "@turf/turf";

/* PRIVATE FUNCTIONS */


/* EPICS HOOKS */
const loadNewFeaturesGeometries = (action$, store) => {
    // on each CREATE_NEW_FEATURE action triggered
    return action$.ofType(LOAD_GEOMETRIES)
        .switchMap((action) => {
            const state = store.getState();
            const geomProp = findGeometryProperty(describeSelector(state)).localType;
            // Remove properties and attribute new id
            var features = action.features.map((f) => {
                // is polygon ?
                if (geomProp.toLowerCase().includes('polygon') && f.geometry.type.toLowerCase().includes('line')) {
                    f = lineToPolygon(f);
                }
                // is Multi
                if (geomProp.toLowerCase().includes('multi')) {
                    f = combine(f).features[0];
                }
                delete f.properties;
                f.id = uuid.v4();
                return f;
            })
            return Rx.Observable.of(createNewFeatures(features));
        });
};

const displayBtnImport = (action$, store) => {
    return action$.ofType(TOGGLE_MODE)
        .switchMap((action) => {
            const state = store.getState();
            // Warning - Changing selector will directly update state -> need refresh element (not specialy trigger actions)
            if (action.mode === 'EDIT') {
                document.getElementById('featuregrid-toolbar').appendChild(document.getElementById('fg-load-geom'));
                var element = document.getElementById('fg-load-geom');
                element.style.removeProperty("width");
                element.style.removeProperty("padding");
                element.style.removeProperty("border-width");
            } else if (action.mode === 'VIEW') {
                document.getElementById('extension-load-geom').appendChild(document.getElementById('fg-load-geom'));
            }
            return Rx.Observable.empty();
        });
};

const onCloseFGBtnImport = (action$, store) => {
    return action$.ofType(CLOSE_FEATURE_GRID)
        .switchMap((action) => {
            document.getElementById('extension-load-geom').appendChild(document.getElementById('fg-load-geom'));
            return Rx.Observable.empty();
        });
};

/* EXPORTS */
export default {
    loadNewFeaturesGeometries,
    displayBtnImport,
    onCloseFGBtnImport
};
