'use strict';

const { init } = require('../codecs/json');

describe( 'JSON Codec', () => {
    let mockLog;
    let mockPublish;
    let mockNotify;
    let mockConfig;

    beforeEach( () => {
        mockLog = jest.fn();
        mockLog.warn = jest.fn();
        mockPublish = jest.fn();
        mockNotify = jest.fn();
        mockConfig = {
            jsonCodec: {
                properties: {
                    on: 'state.power',
                    brightness: 'state.brightness',
                    rgb: 'state.rgb'
                },
                fixed: {
                    version: 1
                }
            }
        };
    } );

    describe( 'init', () => {
        it( 'should return encode and decode functions', () => {
            const codec = init( { log: mockLog, config: mockConfig } );
            expect( codec ).toHaveProperty( 'encode' );
            expect( codec ).toHaveProperty( 'decode' );
            expect( typeof codec.encode ).toBe( 'function' );
            expect( typeof codec.decode ).toBe( 'function' );
        } );

        it( 'should warn if jsonCodec is missing', () => {
            init( { log: mockLog, config: {} } );
            expect( mockLog.warn ).toHaveBeenCalledWith( expect.stringContaining( 'Add jsonCodec object' ) );
        } );
    } );

    describe( 'decode', () => {
        it( 'should decode a property from JSON message', () => {
            const codec = init( { log: mockLog, config: mockConfig } );
            const message = JSON.stringify( { state: { power: true, brightness: 80 } } );
            const info = { topic: 'test/topic', property: 'on' };
            
            const result = codec.decode( message, info, jest.fn() );
            expect( result ).toBe( true );
        } );

        it( 'should decode nested properties', () => {
            const codec = init( { log: mockLog, config: mockConfig } );
            const message = JSON.stringify( { state: { power: true, brightness: 100 } } );
            const info = { topic: 'test/topic', property: 'brightness' };
            
            const result = codec.decode( message, info, jest.fn() );
            expect( result ).toBe( 100 );
        } );

        it( 'should return undefined for missing properties', () => {
            const codec = init( { log: mockLog, config: mockConfig } );
            const message = JSON.stringify( { other: { data: 'here' } } );
            const info = { topic: 'test/topic', property: 'on' };
            
            const result = codec.decode( message, info, jest.fn() );
            expect( result ).toBeUndefined();
        } );

        it( 'should decode rgb array', () => {
            const codec = init( { log: mockLog, config: mockConfig } );
            const message = JSON.stringify( { state: { rgb: [ 255, 128, 0 ] } } );
            const info = { topic: 'test/topic', property: 'rgb' };
            
            const result = codec.decode( message, info, jest.fn() );
            expect( result ).toEqual( [ 255, 128, 0 ] );
        } );
    } );

    describe( 'encode', () => {
        it( 'should encode a property to JSON message', ( done => {
            const codec = init( { log: mockLog, config: mockConfig } );
            const info = { topic: 'test/topic', property: 'on' };
            
            codec.encode( true, info, ( publishedMessage ) => {
                const parsed = JSON.parse( publishedMessage );
                expect( parsed.state.power ).toBe( true );
                expect( parsed.version ).toBe( 1 );
                done();
            } );
        } ) );

        it( 'should handle multiple encode calls on same topic', ( done => {
            jest.useFakeTimers();
            const codec = init( { log: mockLog, config: mockConfig } );
            const info = { topic: 'test/topic', property: 'on' };
            
            codec.encode( true, info, ( publishedMessage ) => {
                const parsed = JSON.parse( publishedMessage );
                expect( parsed.state.power ).toBe( true );
            } );

            const info2 = { topic: 'test/topic', property: 'brightness' };
            codec.encode( 75, info2, ( publishedMessage ) => {
                const parsed = JSON.parse( publishedMessage );
                expect( parsed.state.power ).toBe( true );
                expect( parsed.state.brightness ).toBe( 75 );
                done();
            } );

            jest.runAllTimers();
            jest.useRealTimers();
        } ) );
    } );

    describe( 'fixedByTopic', () => {
        it( 'should use topic-specific fixed properties', ( done => {
            const configWithTopicFixed = {
                jsonCodec: {
                    properties: { on: 'power' },
                    fixedByTopic: {
                        'test/topic1': { source: 'topic1' },
                        'test/topic2': { source: 'topic2' }
                    }
                }
            };
            const codec = init( { log: mockLog, config: configWithTopicFixed } );
            const info = { topic: 'test/topic1', property: 'on' };
            
            codec.encode( true, info, ( publishedMessage ) => {
                const parsed = JSON.parse( publishedMessage );
                expect( parsed.source ).toBe( 'topic1' );
                expect( parsed.power ).toBe( true );
                done();
            } );
        } ) );
    } );

    describe( 'retain option', () => {
        it( 'should retain message state when retain is true', ( done => {
            jest.useFakeTimers();
            const configWithRetain = {
                jsonCodec: {
                    properties: { on: 'power', brightness: 'level' },
                    fixed: {},
                    retain: true
                }
            };
            const codec = init( { log: mockLog, config: configWithRetain } );
            
            let callCount = 0;
            const outputCallback = ( publishedMessage ) => {
                callCount++;
                const parsed = JSON.parse( publishedMessage );
                if ( callCount === 1 ) {
                    expect( parsed.power ).toBe( true );
                } else if ( callCount === 2 ) {
                    expect( parsed.power ).toBe( true );
                    expect( parsed.level ).toBe( 50 );
                    done();
                }
            };

            codec.encode( true, { topic: 'test/topic', property: 'on' }, outputCallback );
            jest.runAllTimers();

            codec.encode( 50, { topic: 'test/topic', property: 'brightness' }, outputCallback );
            jest.runAllTimers();
            jest.useRealTimers();
        } ) );
    } );
} );
