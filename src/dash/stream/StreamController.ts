import { FactoryObject } from "../../types/dash/Factory";
import { AdaptationSet, Mpd } from "../../types/dash/MpdFile";
import { AdaptationSetAudioSegmentRequest, AdaptationSetVideoSegmentRequest, MpdSegmentRequest, PeriodSegmentRequest } from "../../types/dash/Net";
import FactoryMaker from "../FactoryMaker";
import BaseURLParserFactory, { BaseURLParser, URLNode } from "../parser/BaseURLParser"
import URLUtilsFactory, { URLUtils } from "../utils/URLUtils";
import EventBusFactory, { EventBus } from "../event/EventBus";
import { EventConstants } from "../event/EventConstants";
import URLLoaderFactory, { URLLoader } from "../net/URLLoader";
class StreamController {
    private config: FactoryObject = {};
    private baseURLParser: BaseURLParser;
    private baseURLPath: URLNode;
    private URLUtils: URLUtils;
    private eventBus: EventBus;
    private urlLoader: URLLoader;
    private segmentRequestStruct: MpdSegmentRequest;
    constructor(ctx: FactoryObject, ...args: any[]) {

        this.config = ctx.context;
        console.log(this.config);

        this.setup();
        this.initialEvent();

    }
    initialEvent() {
        this.eventBus.on(EventConstants.MANIFEST_PARSE_COMPLETED, this.onManifestParseCompleted, this);
    }

    setup() {
        this.baseURLParser = BaseURLParserFactory().getInstance();
        this.URLUtils = URLUtilsFactory().getInstance();
        this.eventBus = EventBusFactory().getInstance();
        this.urlLoader = URLLoaderFactory().getInstance();
    }
    onManifestParseCompleted(mainifest: Mpd) {
        this.segmentRequestStruct = this.generateSegmentRequestStruct(mainifest);
        console.log(this.segmentRequestStruct);
    }

    generateBaseURLPath(Mpd: Mpd) {
        this.baseURLPath = this.baseURLParser.parseManifestForBaseURL(Mpd as Mpd)
    }

    generateSegmentRequestStruct(Mpd: Mpd): MpdSegmentRequest {
        this.generateBaseURLPath(Mpd);
        let baseURL = Mpd["baseURL"] || ""
        let MpdSegmentRequest: MpdSegmentRequest = {
            type: "MpdSegmentRequest",
            request: []
        };
        for (let i = 0; i < Mpd["Period_asArray"].length; i++) {
            let Period = Mpd["Period_asArray"][i];
            let PeriodSegmentRequest = {
                VideoSegmentRequest: [],
                AudioSegmentRequest: []
            };
            for (let j = 0; j < Period["AdaptationSet_asArray"].length; j++) {
                let AdaptationSet = Period["AdaptationSet_asArray"][j];
                let res = this.generateAdaptationSetVideoOrAudioSegmentRequest(AdaptationSet, baseURL, i, j)
                if (AdaptationSet.mimeType === "video/mp4") {
                    PeriodSegmentRequest.VideoSegmentRequest.push({
                        type: "video",
                        video: res
                    })
                } else if (AdaptationSet.mimeType === "audio/mp4") {
                    PeriodSegmentRequest.AudioSegmentRequest.push({
                        lang: "en",
                        audio: res
                    })
                }
            }
            MpdSegmentRequest.request.push(PeriodSegmentRequest);
        }


        return MpdSegmentRequest

    }

    generateAdaptationSetVideoOrAudioSegmentRequest(AdaptationSet: AdaptationSet, baseURL: string, i: number, j: number): AdaptationSetVideoSegmentRequest | AdaptationSetAudioSegmentRequest {
        console.log(AdaptationSet, baseURL, i, j, '7997');
        let res = {}
        for (let k = 0; k < AdaptationSet["Representation_asArray"].length; k++) {
            let Representation = AdaptationSet["Representation_asArray"][k];
            let url = this.URLUtils.resolve(baseURL, this.baseURLParser.getBaseURLByPath([i, j, k], this.baseURLPath));
            res[Representation.resolvePower] = []

            res[Representation.resolvePower].push(this.URLUtils.resolve(url, Representation.initializationURL))
            res[Representation.resolvePower].push(Representation.mediaURL.map(item => {
                return this.URLUtils.resolve(url, item);

            }))
            console.log(url, '/////////', res);
        }
        return res

    }

    async loadSegment(videoURL,audioURL) {
        let p1 = this.urlLoader.load({url:videoURL,responseType:"arraybuffer"},"Segment") as Promise<any>;
        let p2 = this.urlLoader.load({url:audioURL,responseType:"arraybuffer"},"Segment") as Promise<any>;

        let p = await Promise.all([p1,p2]);
        console.log(p,'ppp');
        
    }



}

const factory = FactoryMaker.getClassFactory(StreamController);
export default factory;
export { StreamController };