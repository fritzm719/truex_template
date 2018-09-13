const TXConfig = (function () {
	const creativeImages = 
	[
		'sprite.png'
	];

    const creativeScripts = 
	[
        'https://cdnjs.cloudflare.com/ajax/libs/gsap/2.0.2/plugins/CSSPlugin.min.js',
		'https://cdnjs.cloudflare.com/ajax/libs/gsap/2.0.2/easing/EasePack.min.js',
		'https://cdnjs.cloudflare.com/ajax/libs/gsap/2.0.2/TweenLite.min.js',
		'https://imasdk.googleapis.com/js/sdkloader/ima3.js'
	];

	const creativeCSS = 
	[
		'edit/styles.css'
        //'https://media.truex.com/file_assets/2018-08-23/50c0d3f5-92e6-4378-896f-bf007296e518.css'
	];

	const creativeHTML = 'edit/markup.html';
	//const creativeHTML = 'https://media.truex.com/file_assets/2018-08-23/d4a1fe2e-25fa-4df9-a44b-497e39fd73fc.html';
	let markupContainer;
	let loadedAssets = 0;
	const totalAssets = 1 + creativeImages.length + creativeScripts.length + creativeCSS.length;
	let engagementStartedFiredOnce = false;

    return {
		markupContainer            : markupContainer,
		loadedAssets               : loadedAssets,
		totalAssets                : totalAssets,
		engagementStartedFiredOnce : engagementStartedFiredOnce,
		creativeImages             : creativeImages,
		creativeScripts            : creativeScripts,
		creativeCSS                : creativeCSS,
		creativeHTML               : creativeHTML
	};

})();

const TXAd = (function () {
	function init () {
		TXM.dispatcher.addEventListenerOnce( 'ENGAGEMENT_STARTED', adStart);
		TXM.dispatcher.addEventListenerOnce( 'ENGAGEMENT_ENDED', adEnd );
		TXM.dispatcher.addEventListenerOnce( 'ENGAGEMENT_CREDITED', adEngagementCredited);

		loadImages (TXConfig.creativeImages);
		loadScripts(TXConfig.creativeScripts);
		loadCSS    (TXConfig.creativeCSS);
		loadHTML   (TXConfig.creativeHTML);
	}

	function adStart () {
		if ( TXConfig.loadedAssets == TXConfig.totalAssets && TXConfig.engagementStartedFiredOnce ) {
			TXM.ui.show(TXConfig.markupContainer);
            TXCreative.render();
		}
		TXConfig.engagementStartedFiredOnce = true;
	}

	function adEnd () {
		TXVideo.destroy();
        TXVast.destroy();
        TXAudio.destroy();
		TXCreative.destroy();
	}

	function adEngagementCredited () {
		//console.log( "True Attention is: " + TXM.api.true_attention.completed );
	}

	function loadImages (urls) {
		for (let i = 0; i < urls.length; i++) {
			let url = urls[i];
			$( '<img />' ).attr('src', url).load(updateAssetsLoaded);
		}
	}

	function loadScripts ( urls ) {
		for (let i = 0; i < urls.length; i++) {
			let url = urls[i];
			$.getScript( url, updateAssetsLoaded);
		}
	}

	function loadCSS ( urls ) {
		for (let i = 0; i < urls.length; i++) {
			appendCSS(urls[i]);
		}
	}

	function appendCSS(url){
		$.ajax({ 
			url      : url,
			dataType : 'text',
			success  : function ( data ) {
				$( '<style></style>' ).append( data ).appendTo( 'head' );
				updateAssetsLoaded();
			} 
		});
	}

	function loadHTML ( url ) {
		$.ajax({ 
				url      : url,
				dataType : 'text',
				success  : function ( data ) {
					TXConfig.markupContainer = data;
					updateAssetsLoaded();
				} 
			});
	}

	function updateAssetsLoaded () {
		TXConfig.loadedAssets += 1;
		TXM.dispatcher.dispatchEvent('ENGAGEMENT_ASSET_LOADING_PROGRESS', TXConfig.loadedAssets / TXConfig.totalAssets);
		if (TXConfig.loadedAssets == TXConfig.totalAssets) {
			TXM.dispatcher.dispatchEvent( 'INTERACTIVE_ASSET_READY' );
			adStart();
		}
	}
	
	return {
		init : init
	};

})();

const EventDispatcher = (function(){

    function addEventListener(event, callback){
        document.addEventListener( event, callback, false );   
    }
    
    function removeEventListener(event, callback){
        document.removeEventListener( event, callback );   
    }
    
    function dispatchEvent(eventName, eventDetails){
        let event = new CustomEvent( eventName, { detail: eventDetails } );
        document.dispatchEvent(event);
    }
    
    return {
        addEventListener    : addEventListener,
        removeEventListener : removeEventListener,
        dispatchEvent       : dispatchEvent
    };

})();

const VideoData = (function() {
    let aVideo = [];
    let nCtr=0;
    
    function add(s){
        aVideo.push({id:s, replay:false});
    }
    
    function next(){
        nCtr=(nCtr+1)%aVideo.length;
    }
    
    function prev(){
        nCtr=(aVideo.length+nCtr-1)%aVideo.length;
    }
    
    function getData(){
        return aVideo[nCtr];
    }
    
    function setItem(n){
        nCtr=n;
    }
    
    function getItem(){
        return nCtr;
    }
    
    return {
        add : add,
        next : next,
        prev : prev,
        getData : getData,
        setItem : setItem,
        getItem : getItem
    };
})();

const TXVideo = (function (obj) {
    const ENDED = 'ended'+Math.random();
    const STARTED = 'started'+Math.random();
    const ext = Object.create(obj);
    
	let videoStart         = false;
	let videoFirstQuartile = false;
	let videoMidpoint      = false;
	let videoThirdQuartile = false;

	let $video;
	let $videoOverlay;
	let $videoPlayer;
    let initPlay=false;
    let autoplayAllowed=false;
    let autoplayRequiresMuted=false;

	function init () {
        $videoOverlay = $( '.video_holder__overlay' );
		$videoPlayer  = $( '#video_player' );
        $video = $('#video0');
        //addListeners();
	}
    
    function parseId(s){
        return TXM.params[s] || TXM.params[s.replace(' Replay','')];
    }
    
    function load(){
        reset();
        autoplayAllowed=false;
        $videoPlayer.css('visibility','hidden');
        $videoOverlay.hide();
		$video.html('<source type="video/mp4" src="'+(parseId(VideoData.getData().id) || 'https://media.truex.com/video_assets/2018-02-15/1b9aca2f-fdfc-42b6-a130-92888f8752ff_large.mp4')+'" />');
		$video.load();
	}
    
    function addListeners(){
		$video.on( 'play', videoStarted );
		$video.on( 'canplay', videoCanPlay );
		$video.on( 'pause', videoPaused );
		$video.on( 'ended', videoEnded );
		$video.on( 'timeupdate', videoProgress );
        $videoOverlay.on('click',clickVideo);
        $(window).on('focus',videoFocus);
    }

	function destroy () {
		$video.off( 'play', videoStarted );
		$video.off( 'canplay', videoCanPlay );
		$video.off( 'pause', videoPaused );
		$video.off( 'ended', videoEnded );
		$video.off( 'timeupdate', videoProgress );
        $videoOverlay.off('click',clickVideo);
        $(window).off('focus',videoFocus);
	}

	function play () {
        if(!TXVideo.initPlay && TXM.params.autoplay_with_sound_disabled){
            checkMutedAutoplaySupport();
        }else{
            autoplayRequiresMuted=false;
            unMute();
            $videoOverlay.hide();
            TXVideo.initPlay=true;
            $video.get(0).play();
        }
    }
    
    function checkMutedAutoplaySupport() {
        mute();
        let playPromise = $video.get(0).play();
        if (playPromise !== undefined) {
            playPromise.then(onMutedAutoplaySuccess).catch(onMutedAutoplayFail);
        }
    }
    
    function onMutedAutoplaySuccess() {
        autoplayRequiresMuted=true;
        $videoOverlay.show();
        $videoOverlay.html('<div class="round"><div class="sprite cta0 center"></div></div>');
    }

    function onMutedAutoplayFail() {
        autoplayRequiresMuted=false;
        unMute();
        $videoOverlay.show();
        $videoOverlay.html('<div class="play center"></div>');
    }

	function pause () {
		$video.get(0).pause();
	}
    
    function mute(){
        $video.get(0).volume=0;
        $video.get(0).muted=true;
    }
    
    function unMute(){
        $video.get(0).volume=1;
        $video.get(0).muted=false;
    }
	
	function clickVideo(){
		TXVideo.initPlay=true;
        play();
	}
    
    function videoFocus(){
        if(VideoData.getData().replay) return;
        play();
    }

	function videoStarted () {
        if(VideoData.getData().replay) {
            TXM.api.track( 'multimedia', 'video_replay', VideoData.getData().id );
        }
        VideoData.getData().replay=false;
        if(autoplayAllowed) {
            $videoPlayer.css('visibility','visible');
            if(!autoplayRequiresMuted) $videoOverlay.hide();
        }
		if(videoStart) return;
		videoStart = true;
        TXM.api.track( 'multimedia', 'video_started', VideoData.getData().id );
        ext.dispatchEvent(STARTED,{});
	}
    
    function videoCanPlay(){
        autoplayAllowed=true;
        $videoPlayer.css('visibility','visible');
    }
    
    function videoPaused (){
        $videoOverlay.show();
        $videoOverlay.html('<div class="play center"></div>');
    }

	function videoEnded () {
        VideoData.getData().replay=true;
        TXVideo.initPlay=true;
		$videoPlayer.css('visibility','hidden');
		$video.get(0).pause();
        $videoOverlay.html('<div class="sprite replay center"></div>');

		if(navigator.userAgent.match(/iPhone|iPad|iPod/i))
			$video.get(0).webkitExitFullscreen();
		if ( document.fullscreenEnabled || document.webkitFullscreenEnabled ) {
			if ( document.exitFullscreen ) {
				document.exitFullscreen();
			} else if ( document.webkitExitFullscreen ) {
				document.webkitExitFullscreen();
			}
		}
		TXM.api.track( 'multimedia', 'video_completed', VideoData.getData().id );
        setTimeout(reset,100);
        ext.dispatchEvent(ENDED,{});
	}
    
    function reset(){
        videoStart         = false;
		videoFirstQuartile = false;
		videoMidpoint      = false;
		videoThirdQuartile = false;
    }

	function videoProgress (e) {
		const progress = e.currentTarget.currentTime / e.currentTarget.duration;
		if( !videoFirstQuartile && progress >= 0.25 ) {
			videoFirstQuartile = true;
			TXM.api.track( 'multimedia', 'video_first_quartile', VideoData.getData().id );
		}else if ( !videoMidpoint && progress >= 0.50 ) {
			videoMidpoint = true;
			TXM.api.track('multimedia', 'video_second_quartile', VideoData.getData().id );
		}else if ( !videoThirdQuartile && progress >= 0.75 ) {
			videoThirdQuartile = true;
			TXM.api.track( 'multimedia', 'video_third_quartile', VideoData.getData().id );
		}
	}
    
    ext.ENDED = ENDED;
    ext.STARTED = STARTED;
    ext.init = init;
    ext.destroy = destroy;
    ext.play = play;
    ext.pause = pause;
    ext.load = load;
    ext.initPlay = initPlay;
    
    return ext;

})( EventDispatcher || {} );

const TXVast = (function (obj) {
    const STARTED = 'started'+Math.random();
    const ENDED = 'ended'+Math.random();
    const ERROR = 'error'+Math.random();
    const ext = Object.create(obj);
    
	let adsManager;
	let adsLoader;
	let adDisplayContainer;
	let videoContent;
	let vidWidth = 0;
    let vidHeight = 0;
    let id='';
    let $videoOverlay;
    let $videoPlayer;
    let autoplayAllowed=false;
    let autoplayRequiresMuted=false;
    let isPlaying=false;
    let isInit=false;
    let adsManagerLoaded = false;
	
	function init(id,w,h) {
        TXVast.id = id;
        vidWidth = w || 960;
        vidHeight = h || 540;
		videoContent = document.getElementById('video0');
        $videoOverlay = $('.video_holder__overlay');
        $videoPlayer = $('#video_player');
	  	setUpIMA();
        checkAutoplaySupport();
	}

	function setUpIMA() {
        if(isInit) return;
        isInit=true;
        TXVast.isPlaying=false;
        adsManagerLoaded=false;
        $videoPlayer.css('visibility','hidden');
	  	// Create the ad display container.
	  	createAdDisplayContainer();
	  	// Create ads loader.
	  	adsLoader = new google.ima.AdsLoader(adDisplayContainer);
	  	// Listen and respond to ads loaded and error events.
	  	adsLoader.addEventListener(google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED, onAdsManagerLoaded, false);
	  	adsLoader.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, onAdError, false);
        $videoOverlay.on('click', clickVideo);
	}

	function createAdDisplayContainer() {
	  	adDisplayContainer = new google.ima.AdDisplayContainer(document.getElementById('ads_container'), videoContent, document.getElementById('ads_container'));
        videoContent.load();
        adDisplayContainer.initialize();
	}
    
    function checkAutoplaySupport() {
        TXM.api.track('other', 'can_auto_play', !TXM.params.autoplay_with_sound_disabled);
        if(TXM.params.autoplay_with_sound_disabled)
            onAutoplayWithSoundFail();
        else
            onAutoplayWithSoundSuccess();
    }

    function onAutoplayWithSoundSuccess() {
        // If we make it here, unmuted autoplay works.
        autoplayAllowed = true;
        autoplayRequiresMuted = false;
        autoplayChecksResolved();
    }

    function onAutoplayWithSoundFail() {
        // Unmuted autoplay failed. Now try muted autoplay.
        checkMutedAutoplaySupport();
    }

    function checkMutedAutoplaySupport() {
        videoContent.volume = 0;
        videoContent.muted = true;
        let playPromise = videoContent.play();
        if (playPromise !== undefined) {
            playPromise.then(onMutedAutoplaySuccess).catch(onMutedAutoplayFail);
        }
    }

    function onMutedAutoplaySuccess() {
        // If we make it here, muted autoplay works but unmuted autoplay does not.
        videoContent.pause();
        autoplayAllowed = true;
        autoplayRequiresMuted = true;
        autoplayChecksResolved();
    }

    function onMutedAutoplayFail() {
        // Both muted and unmuted autoplay failed. Fall back to click to play.
        videoContent.volume = 1;
        videoContent.muted = false;
        autoplayAllowed = false;
        autoplayRequiresMuted = false;
        autoplayChecksResolved();
    }
    
    function autoplayChecksResolved() {
        if(autoplayAllowed){
            if(autoplayRequiresMuted){
                $videoOverlay.show();
                $videoOverlay.html('<div class="round"><div class="sprite cta0 center"></div></div>');
            }else{
                $videoOverlay.hide();
            }
        }else{
            $videoOverlay.show();
            $videoOverlay.html('<div class="play center"></div>');
        }
        requestAds();
        setTimeout(function() {
            // 10s timeout (a little over IMA ad_request 8s default timeout)
            if (!adsManagerLoaded) {
                reset();
                TXM.api.track('other', 'ima_error', 'ads_manager_time_out_10s');
            }
        }, 5000);
    }
    
    function reset(){
        destroy();
        setUpIMA();
        onMutedAutoplayFail();
    }
    
    function requestAds(){
        // Request video ads.
	  	let adsRequest = new google.ima.AdsRequest();
	  	adsRequest.adTagUrl = TXM.params[TXVast.id] || 'https://ad.doubleclick.net/ddm/pfadx/N7217.1849358TRUEXMEDIAINC/B21355873.224253596;sz=0x0;ord=[timestamp];dc_lat=;dc_rdid=;tag_for_child_directed_treatment=;tfua=;dcmt=text/xml;dc_vast=3';

	  	// Specify the linear and nonlinear slot sizes. This helps the SDK to
	  	// select the correct creative if multiple are returned.
	  	adsRequest.linearAdSlotWidth = vidWidth;
	  	adsRequest.linearAdSlotHeight = vidHeight;

	  	adsRequest.nonLinearAdSlotWidth = vidWidth;
	  	adsRequest.nonLinearAdSlotHeight = vidHeight;
        
        adsRequest.setAdWillAutoPlay(autoplayAllowed);
        adsRequest.setAdWillPlayMuted(autoplayRequiresMuted);
        
        adsLoader.requestAds(adsRequest);
    }

	function playAds() {
        try {
			// Initialize the ads manager. Ad rules playlist will start at this time.
			adsManager.init(vidWidth, vidHeight, google.ima.ViewMode.NORMAL);
			// Call play to start showing the ad. Single video and overlay ads will
			// start at this time; the call will be ignored for ad rules.
			adsManager.start();
	  	} catch (adError) {
			// An error may be thrown if there was a problem with the VAST response.
			videoContent.play();
	  	}
	}
    
    function clickVideo(){
        $videoOverlay.hide();
        if(!TXVast.isPlaying){
            playAds();
        }else{
            resume();
            unMute();
        }
	}

	function onAdsManagerLoaded(adsManagerLoadedEvent) {
        adsManagerLoaded = true;
	  	// Get the ads manager.
	  	let adsRenderingSettings = new google.ima.AdsRenderingSettings();
	  	adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true;
        adsRenderingSettings.uiElements = [''];
	  	// videoContent should be set to the content video element.
	  	adsManager = adsManagerLoadedEvent.getAdsManager(videoContent, adsRenderingSettings);

	  	// Add listeners to the required events.
	  	adsManager.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR,onAdError);
	  	adsManager.addEventListener(google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED,onContentPauseRequested);
	  	adsManager.addEventListener(google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED,onContentResumeRequested);
	  	adsManager.addEventListener(google.ima.AdEvent.Type.ALL_ADS_COMPLETED,onAdEvent);

	  	// Listen to any additional events, if necessary.
	  	adsManager.addEventListener(google.ima.AdEvent.Type.LOADED,onAdEvent);
	  	adsManager.addEventListener(google.ima.AdEvent.Type.STARTED,onAdEvent);
	  	adsManager.addEventListener(google.ima.AdEvent.Type.FIRST_QUARTILE,onAdEvent);
	  	adsManager.addEventListener(google.ima.AdEvent.Type.MIDPOINT,onAdEvent);
	  	adsManager.addEventListener(google.ima.AdEvent.Type.THIRD_QUARTILE,onAdEvent);
	  	adsManager.addEventListener(google.ima.AdEvent.Type.COMPLETE,onAdEvent);
	  	adsManager.addEventListener(google.ima.AdEvent.Type.CLICK,onAdEvent);
	  	adsManager.addEventListener(google.ima.AdEvent.Type.RESUMED,onAdEvent);
	  	adsManager.addEventListener(google.ima.AdEvent.Type.PAUSED,onAdEvent);
        
        if(autoplayAllowed){
            playAds();
        }else{
            ext.dispatchEvent(STARTED,{});
        }
	}

	function onAdEvent(adEvent) {
	  	// Retrieve the ad from the event. Some events (e.g. ALL_ADS_COMPLETED)
	  	// don't have ad object associated.
	  	switch (adEvent.type) {
			case google.ima.AdEvent.Type.LOADED:
		  		break;
			case google.ima.AdEvent.Type.STARTED:
		  		TXM.api.track( 'multimedia', 'video_started', TXVast.id);
            case google.ima.AdEvent.Type.RESUMED:
                if(TXVast.isPlaying) $videoOverlay.hide();
                TXVast.isPlaying=true;
                $videoPlayer.css('visibility','visible');
                ext.dispatchEvent(STARTED,{});
		  		break;
			case google.ima.AdEvent.Type.FIRST_QUARTILE:
		  		TXM.api.track( 'multimedia', 'video_first_quartile', TXVast.id);
		  		break;
			case google.ima.AdEvent.Type.MIDPOINT:
		  		TXM.api.track( 'multimedia', 'video_second_quartile', TXVast.id);
		  		break;
			case google.ima.AdEvent.Type.THIRD_QUARTILE:
		  		TXM.api.track( 'multimedia', 'video_third_quartile', TXVast.id);
		  		break;
			case google.ima.AdEvent.Type.COMPLETE:
                TXVast.isPlaying=false;
		  		TXM.api.track( 'multimedia', 'video_completed', TXVast.id);
                stop();
                $videoOverlay.html('<div class="sprite replay center"></div>');
                ext.dispatchEvent(ENDED,{});
                break;
            case google.ima.AdEvent.Type.PAUSED:
                $videoOverlay.show();
                if(TXVast.isPlaying) $videoOverlay.html('<div class="play center"></div>');
                break;
	  	}
	}
	
	function resume(){
		adsManager.resume();
	}
	
	function pause(){
		adsManager.pause();
	}
	
	function stop(){
        if(adsManager)
		  adsManager.stop();
	}
    
    function mute(){
        adsManager.setVolume(0);
    }
    
    function unMute(){
        adsManager.setVolume(1);
    }

	function onAdError(adErrorEvent) {
        //console.log(adErrorEvent.getError());
        ext.dispatchEvent(ERROR,{});
        reset();
	}

	function onContentPauseRequested() {
	  	// This function is where you should setup UI for showing ads (e.g.
	  	// display ad timer countdown, disable seeking etc.)
	  	// setupUIForAds();
	}

	function onContentResumeRequested() {
	  	// This function is where you should ensure that your UI is ready
	  	// to play content. It is the responsibility of the Publisher to
	  	// implement this function when necessary.
	  	// setupUIForContent();
	}
    
    function destroyAdsManager(){
        if(!adsManager) return;
        stop();
        adsManager.removeEventListener(google.ima.AdErrorEvent.Type.AD_ERROR,onAdError);
	  	adsManager.removeEventListener(google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED,onContentPauseRequested);
        adsManager.removeEventListener(google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED,onContentResumeRequested);
	  	adsManager.removeEventListener(google.ima.AdEvent.Type.ALL_ADS_COMPLETED,onAdEvent);
	  	adsManager.removeEventListener(google.ima.AdEvent.Type.LOADED,onAdEvent);
	  	adsManager.removeEventListener(google.ima.AdEvent.Type.STARTED,onAdEvent);
	  	adsManager.removeEventListener(google.ima.AdEvent.Type.FIRST_QUARTILE,onAdEvent);
	  	adsManager.removeEventListener(google.ima.AdEvent.Type.MIDPOINT,onAdEvent);
	  	adsManager.removeEventListener(google.ima.AdEvent.Type.THIRD_QUARTILE,onAdEvent);
	  	adsManager.removeEventListener(google.ima.AdEvent.Type.COMPLETE,onAdEvent);
	  	adsManager.removeEventListener(google.ima.AdEvent.Type.CLICK,onAdEvent);
	  	adsManager.removeEventListener(google.ima.AdEvent.Type.RESUMED,onAdEvent);
	  	adsManager.removeEventListener(google.ima.AdEvent.Type.PAUSED,onAdEvent);
	  	adsManager.destroy();
    }
	
	function destroy(){
        if(!isInit) return;
        isInit=false;
        destroyAdsManager();
        adDisplayContainer.destroy();
        adsLoader.removeEventListener(google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED, onAdsManagerLoaded);
	  	adsLoader.removeEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, onAdError);
        adsLoader.destroy();
        $videoOverlay.off( 'click', clickVideo);
	}
    
    ext.STARTED = STARTED;
    ext.ENDED = ENDED;
    ext.ERROR = ERROR;
    ext.init = init;
    ext.destroy = destroy;
    ext.pause = pause;
    ext.resume = resume;
    ext.isPlaying = isPlaying;
    ext.id = id;
    
    return ext;
    
})( EventDispatcher || {} );

const TXAudio = (function () {
	const audio={};

	function add(id,url){
		audio[id] = document.createElement('audio');
		audio[id].src=url;
		audio[id].type='audio/mpeg';
	}

	function play(id,loop){
		if(audio[id].readyState>0){
			audio[id].currentTime=0;
		}
		audio[id].loop=loop;
		audio[id].play();
	}
    
    function stop(){
        for(let i in audio){
			audio[i].pause();
		}
    }
	
	function mute(){
		for(let i in audio){
			audio[i].muted=true;
		}
	}
	
	function unMute(){
		for(let i in audio){
			audio[i].muted=false;
		}
	}
    
    function destroy(){
        mute();
        stop();
    }

	return {
		add 	: add,
		play 	: play,
        stop    : stop,
		mute	: mute,
		unMute	: unMute,
        destroy : destroy
	};

})();

const TXCreative = (function () {
    
	function render () {
        VideoData.add('Video');
        TXVideo.init();
        TXVideo.load();
		addListeners();
        //TXVideo.play();
        TXVast.init('Vast Video');
		/*
		TXM.api.incrementCurrentStep();
		TXM.api.setCurrentStep(2);
		*/
	}
	
	function destroy(){
		removeListeners();
	}
	
	function addListeners(){
        TXVideo.addEventListener(TXVideo.STARTED,videoStartHandler);
        TXVideo.addEventListener(TXVideo.ENDED,videoEndHandler);
	}
	
	function removeListeners(){
        TXVideo.removeEventListener(TXVideo.STARTED,videoStartHandler);
        TXVideo.removeEventListener(TXVideo.ENDED,videoEndHandler);
	}
    
    function checkInteraction(){
        if(TXVideo.initPlay) return;
        $('.video_holder__overlay').click();
    }
    
    function videoStartHandler(e){
        
    }
    
    function videoEndHandler(e){
        if(VideoData.getData().id.search('Replay')<0){
            VideoData.getData().id+=' Replay';
        }
    }
    
    function soundHandler(e){
        let $snd=$('#sound');
        if($snd.hasClass('mute')){
            $snd.removeClass('mute');
            if(TXVideo.isPlaying)
                TXVideo.unMute();
            else
                TXAudio.unMute();
        }else{
            $snd.addClass('mute');
            TXVideo.mute();
            TXAudio.mute();
        }
    }
	
	function exitHandler(e){
		TXM.utils.popupWebsite(TXUtil.formatLabel(e.currentTarget.id), TXM.api.true_attention.completed);
	}
	
	function tracker(s){
		TXM.api.track('other', TXUtil.formatLabel(s));
	}

	return {
		render : render,
		destroy: destroy
	};

})();

const TXUtil = (function () { 
	const isMobile = {
    	Android: function() {
      		return navigator.userAgent.match(/Android/i) ? true : false;
    	},
		BlackBerry: function() {
		  	return navigator.userAgent.match(/BlackBerry/i) ? true : false;
		},
		iOS: function() {
		  	return navigator.userAgent.match(/iPhone|iPad|iPod/i) ? true : false;
		},
		iPad: function() {
		  	return navigator.userAgent.match(/iPad/i) ? true : false;
		},
		Windows: function() {
		  	return navigator.userAgent.match(/IEMobile/i) ? true : false;
		},
		any: function() {
		  	return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Windows());
		}
	};
	
	function formatLabel(s){
		const a=s.split('_');
		let sName='';
		for(let i=0;i<a.length;i++){
            sName+=a[i].charAt(0).toUpperCase()+a[i].substr(1)+' ';
		}
		return sName.trim();
	}
	
	function hide(s){
		const $e=($.type(s)==='string') ? $(s) : s;
		$e.hide();
	}
	
	function show(s){
		const $e=($.type(s)==='string') ? $(s) : s;
		$e.show();
	}
	
	function disable(s){
		const $e=($.type(s)==='string') ? $(s) : s;
		$e.css('pointer-events','none');
	}
	
	function enable(s){
		const $e=($.type(s)==='string') ? $(s) : s;
		$e.css('pointer-events','auto');
	}
    
    function getBoundWidth(){
        return $('#container').width()/document.getElementById('container').getBoundingClientRect().width;
    }
    
    function getBoundHeight(){
        return $('#container').height()/document.getElementById('container').getBoundingClientRect().height;
    }
	
	return {
		formatLabel : formatLabel,
		hide 		: hide,
		show 		: show,
		disable 	: disable,
		enable		: enable,
		isMobile	: isMobile,
        getBoundWidth : getBoundWidth,
        getBoundHeight : getBoundHeight
	};
})();

TXAd.init();