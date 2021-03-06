/* eslint-disable */
/* REQUIREMENTS */
import React, {createRef} from 'react';
import { connect } from 'react-redux';
import { name } from '../../../config';
import PropTypes from 'prop-types';

import {get, isString, uniq} from 'lodash';
import { loadGeometries } from '../state/actions';
import geomImportEpics from '../state/epics';
import geomImportExtension from '../state/reducers';

import Dropzone from 'react-dropzone';
const {Glyphicon, Grid, Row, Button: ButtonRB, ButtonGroup, Checkbox} = require('react-bootstrap');
import tooltip from 'mapstore2/web/client/components/misc/enhancers/tooltip';
const Button = tooltip(ButtonRB);
import Dialog from 'mapstore2/web/client/components/misc/Dialog';
import withHint from "mapstore2/web/client/components/data/featuregrid/enhancers/withHint";
import TButtonComp from "mapstore2/web/client/components/data/featuregrid/toolbars/TButton";
const TButton = withHint(TButtonComp);
import HTML from 'mapstore2/web/client/components/I18N/HTML';
import JSZip from 'jszip';
import {
    recognizeExt,
    MIME_LOOKUPS,
    readKml,
    gpxToGeoJSON,
    readZip,
    checkShapePrj,
    shpToGeoJSON
} from 'mapstore2/web/client/utils/FileUtils';
import {Promise} from 'es6-promise';
import Spinner from 'react-spinkit';
import {findGeometryProperty} from 'mapstore2/web/client/utils/ogc/WFS/base';

import {createSelector} from 'reselect';
import {layersSelector} from 'mapstore2/web/client/selectors/layers';
import {describeSelector} from 'mapstore2/web/client/selectors/query';

import Message from "mapstore2/web/client/components/I18N/Message";

/* STYLE */
require('../assets/style.css');

/* SELECTORS */
const geomImportSelector = createSelector(
    state => get(state, 'geomImportExtension.style'),
    layersSelector,
    describeSelector,
    (style, layers, describe) =>
        ({ style, layers: layers, geomType: findGeometryProperty(describe) ? findGeometryProperty(describe).localType.toLowerCase() : null})
);

/* COMPONENT */
class GeomImport extends React.Component {
    static propTypes = {
        verbose: PropTypes.bool,
        closeGlyph: PropTypes.string,
        createNewFeatures: PropTypes.func,
        geomType: PropTypes.string
    };

    static defaultProps = {
        verbose: false,
        style: {display: "none"},
        closeGlyph: "1-close",
        geomType: null
    };

    state = {
        dropZoneDisplay: false,
        dropSuccess: false,
        loading: false,
        error: false,
        success: false,
        errorMessage: '',
        extension: null,
        featureCollection: null,
        successEnabled: true
    };

    dropzoneRef = createRef();

    geomLoading = (boolValue) => this.setState({loading: boolValue});
    onGeomError = (message) => {
        this.setState({error: true, errorMessage: message, success: false})
    };

    onGeomSuccess = (geom) => {
        // Analyze geom
        var _this = this;
        var notAllowedGeom = [];
        var autorizationGeom = [];
        // Remove gpx geomType if shape
        var noMultiGeomType = this.props.geomType.replace('multi', '');
        var isMulti = this.props.geomType.includes('multi');
        var geomCapacities = [noMultiGeomType];
        if (isMulti) { geomCapacities.push('multi' + noMultiGeomType) };
        if (this.state.extension === 'gpx') {
            if (this.props.geomType.includes('polygon')) {
                // Remove point or multipoint from gpx (keep linestring or multilinestring)
                geom.features = geom.features.filter((f) => f.geometry.type.toLowerCase().includes('linestring'))
                geomCapacities.push(this.props.geomType.replace('polygon', 'linestring'));
                if (isMulti) {geomCapacities.push('linestring')}
            } else {
                // Keep only geom associated
                geom.features = geom.features.filter((f) => f.geometry.type.toLowerCase().includes(noMultiGeomType))
            }
        }
        // Parsing geom
        var geomTypes = geom.features.map((g) => g.geometry.type.toLowerCase())
        geomTypes = uniq(geomTypes);
        if (geomTypes.length === 0) {
            this.setState({
                error: true,
                success: false,
                errorMessage: "Il n'existe aucunes g??om??tries compatibles avec celle du service de destination (" + _this.props.geomType + ")"
            })
            return false;
        }

        geomTypes.forEach((geomType) => {
            if (geomType.includes(noMultiGeomType)) {
                // Do nothing
            } else if (geomCapacities.indexOf(geomType) > -1 && _this.state.extension === 'gpx') {
                if (_this.props.geomType.includes('polygon') && geomType.includes("linestring")) {
                    autorizationGeom.push(geomType);
                    this.setState({
                        successEnabled: false
                    });
                }
            } else {
                notAllowedGeom.push(geomType);
            }
        })

        // Rendering
        if (notAllowedGeom.length > 0) {
            this.setState({
                error: true,
                success: false,
                errorMessage: 'Certaines g??om??tries du fichier source (' + notAllowedGeom.join(', ') + ') ne sont pas compatibles avec les g??om??tries du service de destination (' + _this.props.geomType + ')'
            })
        } else {
            this.setState({
                error: false,
                success: true,
                featureCollection: geom,
                autorizationGeom : autorizationGeom
            })
        }

    };

    openFileDialog = () => {
        // Note that the ref is set async,
        // so it might be null at some point
        if (this.dropzoneRef.current) {
            this.dropzoneRef.current.open()
        }
    };

    readFiles = (files, onWarnings) => files.map((file) => {
        const ext = recognizeExt(file.name);
        const type = file.type || MIME_LOOKUPS[ext];
        if (type === 'application/gpx+xml') {
            return readKml(file).then((xml) => {
                this.setState({extension: 'gpx'})
                return gpxToGeoJSON(xml);
            });
        }
        if (type === 'application/x-zip-compressed' ||
            type === 'application/zip' ) {
            return readZip(file).then((buffer) => {
                return checkShapePrj(buffer).then((warnings) => {
                    if (warnings.length > 0) {
                        onWarnings('shapefile.error.missingPrj');
                    }
                    this.setState({extension: 'shp'})
                    return shpToGeoJSON(buffer);
                });
            });
        }
        return null;
    })

    tryUnzip = (file) => {
        return readZip(file).then((buffer) => {
            var zip = new JSZip();
            return zip.loadAsync(buffer);
        });
    };

    checkFileType = (file) => {
        return new Promise((resolve, reject) => {
            const ext = recognizeExt(file.name);
            const type = file.type || MIME_LOOKUPS[ext];
            if (type === 'application/x-zip-compressed' ||
                type === 'application/zip' ||
                type === 'application/gpx+xml') {
                resolve();
            } else {
                this.tryUnzip(file).then(resolve).catch(reject);
            }
        });
    };

    checkfile = (files) => {
        Promise.all(files.map(file => this.checkFileType(file))).then(() => {
            this.onGeomChoosen(files);
        }).catch((error) => {
            this.onGeomError('geomImport.errors.fileNotSupported');
        });
    };

    renderError = () => {
        return (<Row>
            <div style={{textAlign: "center"}} className="alert alert-danger"><Message msgId={this.state.errorMessage}/></div>
        </Row>);
    };

    renderSuccess = () => {
        return (
            <Grid role="body" fluid style={{marginLeft: "15px", marginRight: "15px", textAlign: "left"}}>
                <Row>
                    <div><b>Sources de donn??es :</b> {this.state.featureCollection.fileName}</div>
                </Row>
                <Row>
                    <div><b>Nombre de g??om??tries ?? importer :</b> {this.state.featureCollection.features.length}</div>
                </Row>
                {this.state.extension === 'shp' ? <Row>
                    <div style={{color: "red"}}><b>Attention :</b> Toutes vos donn??es seront transform??es (si n??cessaire) dans le SRS WSG84 (EPSG:4326)</div>
                </Row> : null}
                {this.state.autorizationGeom && this.state.autorizationGeom.length > 0 ?
                    <Checkbox onChange={() => this.setState({successEnabled: !this.state.successEnabled})}
                        checked={this.state.successEnabled}>
                        <Message msgId="geomImport.success.autorizeGeom" />
                    </Checkbox>
                    : null}
                <Row>
                    <div><Message msgId={'geomImport.success.clickToTerminate'}/></div>
                </Row>
        </Grid>
        );
    };

    onGeomChoosen = (files) => {
        // Set state
        this.setState({dropSuccess: true, error: false})
        this.geomLoading(true);
        let queue = this.readFiles(files, this.onGeomError);
        // geoJsons is array of array
        Promise.all(queue).then((geoJsons) => {
            let ls = geoJsons.filter((element) => (element[0] && element[0].features && element[0].features.length !== 0) || element[0].type === "Feature");
            ls = ls.reduce((layers, geoJson) => {
                // geoJson is array
                if (geoJson) {
                    return layers.concat(geoJson.map((layer) => {
                        return layer;
                    }));
                }
                return layers;
            }, []);
            if (ls.length !== 0 ) {
                // Only one file so only one featurecollection extracted
                this.onGeomSuccess(ls[0]);
            } else {
                this.onGeomError('shapefile.error.genericLoadError');
            }
            this.geomLoading(false);
        }).catch(e => {
            console.log(e)
            this.geomLoading(false);
            const errorName = e && e.name || e || '';
            if (isString(errorName) && errorName === 'SyntaxError') {
                this.onGeomError('shapefile.error.shapeFileParsingError');
            } else {
                this.onGeomError('shapefile.error.genericLoadError');
            }
        });
    };

    triggerCreateNewFeatures = () => {
        this.reset()
        this.props.createNewFeatures(this.state.featureCollection.features)
    }

    reset = () => {
        this.setState({
            dropZoneDisplay: !this.state.dropZoneDisplay,
            dropSuccess: false,
            error: false,
            success: false,
            extension: null,
            successEnabled: true,
            autorizationGeom: []
        })
    }

    render() {
        // Should have a render but it can be not displayed
        return (
                <div>
                    <div id="extension-load-geom" style={{display: "none"}}>
                        <TButton
                            id="load-geom"
                            keyProp="load-geom"
                            tooltipId="geomImport.title"
                            onClick={() => this.setState({dropZoneDisplay: !this.state.dropZoneDisplay, dropSuccess: false})}
                            glyph="upload"/>
                    </div>
                    {this.state.dropZoneDisplay &&
                        <Dropzone
                            disableClick
                            ref={this.dropzoneRef}
                            id="DRAGDROP_IMPORT_GEOM"
                            multiple={false}
                            style={{ position: "relative", height: '100%' }}
                            onDrop={this.checkfile}>
                            <div
                                style={{
                                    position: 'fixed',
                                    top: 0,
                                    right: 0,
                                    bottom: 0,
                                    left: 0,
                                    background: 'rgba(0,0,0,0.75)',
                                    color: '#fff',
                                    zIndex: 2000,
                                    display: 'flex',
                                    textAlign: 'center'
                                }}>
                                <Button style={{ border: "none", background: "transparent", color: "white", fontSize: 35, top: 0, right: 0, position: 'absolute' }}
                                    onClick={this.reset}>
                                    <Glyphicon glyph="1-close" />
                                </Button>
                                <div style={{ margin: 'auto', maxWidth: 550 }}>
                                    <div>
                                    {!this.state.dropSuccess ?
                                        <div>
                                            <Glyphicon
                                                glyph="upload"
                                                style={{
                                                    fontSize: 80
                                                }} />
                                            <HTML msgId="geomImport.dropZone.heading" />
                                                <Button bsStyle="primary" onClick={this.openFileDialog}><Message msgId="geomImport.dropZone.selectFiles" /></Button>
                                            <br />
                                            <br />
                                            <HTML msgId="geomImport.dropZone.infoSupported" />
                                            <hr />
                                            <HTML msgId="geomImport.dropZone.note" />
                                            <div>
                                                {this.state.error ? this.renderError() : null}
                                            </div>
                                        </div> :
                                        <Dialog id="geomimport-extension" draggable={false} modal={false}>
                                            <span role="header">
                                                <span className="about-panel-title"><Message msgId="geomImport.dialog.title" /></span>
                                            </span>
                                            <div role="body" style={{color: "black"}}>
                                                {this.state.loading ?
                                                    <div className="btn" style={{"float": "center"}}> <Spinner spinnerName="circle" noFadeIn overrideSpinnerClassName="spinner"/></div> :
                                                    <div>
                                                        {this.state.error ? this.renderError() : null}
                                                        {this.state.success ? this.renderSuccess() : null}
                                                    </div>
                                                }
                                            </div>
                                            <div role="footer">
                                                <ButtonGroup id="geomImport-validation">
                                                    <Button bsStyle="default" onClick={this.reset}><Message msgId="geomImport.footer.cancel" /></Button>
                                                    {this.state.error ? null : <Button bsStyle="primary" onClick={this.triggerCreateNewFeatures} disabled={!this.state.successEnabled}><Message msgId="geomImport.footer.validate" /></Button>}
                                                </ButtonGroup>
                                            </div>
                                        </Dialog> }
                                    </div>
                                </div>
                            </div>
                        </Dropzone>
                    }
                </div>);
    }
}

/* EXPORT PLUGIN */
export default {
    name,
    component: connect(geomImportSelector,
        {
            createNewFeatures: loadGeometries
        }
    )(GeomImport),
    reducers: { geomImportExtension },
    epics: geomImportEpics
};
