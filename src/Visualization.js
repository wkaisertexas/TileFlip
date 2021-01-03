import React from 'react';
import * as d3 from 'd3';
// import 'gif.js'
import GIF from 'gif.js';

class Visualization extends React.Component {
  // props
  // this.edgeLength = edge length of number of shapes per side
  // id
  // this.size = pixel length

  constructor (props) {
    super(props);

    this.state = {
      data: [],
      interval: null,
      ready: false,
      existingBlobs: [],
      time: 0
    };

    this.updateVis = this.updateVis.bind(this);

    this.computeNextState = this.computeNextState.bind(this);

    this.computeVal = this.computeVal.bind(this);
    this.computeNeighbors = this.computeNeighbors.bind(this);

    this.mod = this.mod.bind(this);
    this.floatToGrayscale = this.floatToGrayscale.bind(this);
    this.floatToHSL = this.floatToHSL.bind(this);

    this.refresh = this.refresh.bind(this);

    this.setup = this.setup.bind(this);
    this.drawChart = this.drawChart.bind(this);

    this.flipItem = this.flipItem.bind(this);

    this.setup();
    this.refresh();

    this.gif = new GIF({
      workers: 3,
      quality: 1,
      repeat: 0,
      workerScript: process.env.PUBLIC_URL + '/gif.worker.js',
      debug: true
    });

    this.addGifItem = this.addGifItem.bind(this);
  }

  setup () {
    const data = [];

    this.edgeLength = this.props.edgeLength;
    this.size = this.props.size;

    for (let i = 0; i < this.edgeLength ** 2; i++) {
      data.push({
        index: i,
        x: i % this.edgeLength,
        y: Math.floor(i / this.edgeLength),
        state: 0,
        color: '',
        animate: false,
        invert: false,
        store: {}
      });
    }

    this.setState({ data: data, time: 0 });

    this.margin = { top: this.edgeLength * 0.1, bottom: this.edgeLength * 0.1, left: this.edgeLength * 0.1, right: this.edgeLength * 0.1 };

    this.xScale = d3.scaleLinear()
      .domain([0, this.edgeLength])
      .range([this.margin.left, this.size - this.margin.right]);

    this.yScale = d3.scaleLinear()
      .domain([0, this.edgeLength])
      .range([this.margin.top, this.size - this.margin.bottom]);

    this.squareLength = this.size / this.edgeLength;

    // adjust vals for init data
    console.log(this.props.initdata);
    Object.entries(this.props.initdata).forEach(([key, val]) => {
      try {
        data[parseInt(key)].state = parseFloat(val);
      } catch (e) {
        console.log(e);
      }
    });

    return data;
  }

  updateVis () {
    // for elements that want to transition
    this.viscontainer
      .selectAll('.main-rect')
      .data(this.state.data)
    // .attr("fill", (d,i) => {return this.floatToGrayscale(d.state)})
      .filter((d, i) => d.animate)
      .transition()
      .duration((d, i) => {
        // console.log(d.animate);
        return this.props.refreshRate;
      })
      .ease(d3.easeLinear)
      .attr('fill', (d, i) => {
        return d.color === '' ? 'black' : d.color;
      })
      .attr('fill-opacity', (d, i) => { return !d.invert ? d.state : 1 - d.state; });

    // for elements to just discretely turn on and off
    this.viscontainer
      .selectAll('.main-rect')
      .data(this.state.data)
    // .attr("fill", (d,i) => {return this.floatToGrayscale(d.state)})
      .filter((d, i) => !d.animate)
      .attr('fill', (d, i) => {
        return d.color === '' ? 'black' : d.color;
      })
      .attr('fill-opacity', (d, i) => { return !d.invert ? d.state : 1 - d.state; });
  }

  updateVisDiscreteFlip () {
    this.viscontainer
      .selectAll('.main-rect')
      .data(this.state.data)
      .attr('fill', (d, i) => {
        return d.color === '' ? 'black' : d.color;
      })
      .attr('fill-opacity', (d, i) => { return !d.invert ? d.state : 1 - d.state; });
  }

  computeVal (index) {
    if (index < 0 || index >= this.edgeLength ** 2) {
      return -1;
    } else {
      // console.log(this.state.data[index].state)
      return this.state.data[index].state;
    }
  }

  mod (a, b) {
    // needed otherwise -1 % 8  = -1
    return ((a % b) + b) % b;
  }

  computeNeighbors (index) {
    // goal is to return list of neighbors in formate
    // [up, right, down, left]
    // return actual vals
    // wraps around to other side

    // let r = Math.floor(index/this.edgeLength);
    // let c = index%edgeLength

    const up = this.computeVal(this.mod((index - this.edgeLength), (this.edgeLength ** 2)));
    const down = this.computeVal(this.mod((index + this.edgeLength), (this.edgeLength ** 2)));

    const rawleft = index % this.edgeLength === 0 ? index + this.edgeLength - 1 : index - 1;
    const left = this.computeVal(rawleft);

    const rawright = (index + 1) % this.edgeLength === 0 ? index - this.edgeLength + 1 : index + 1;
    const right = this.computeVal(rawright);

    const upleft = this.computeVal(this.mod((rawleft - this.edgeLength), (this.edgeLength ** 2)));
    const downleft = this.computeVal(this.mod((rawleft + this.edgeLength), (this.edgeLength ** 2)));

    const upright = this.computeVal(this.mod((rawright - this.edgeLength), (this.edgeLength ** 2)));
    const downright = this.computeVal(this.mod((rawright + this.edgeLength), (this.edgeLength ** 2)));

    return [upleft, up, upright, right, downright, down, downleft, left];
  }

  floatToGrayscale (val) {
    // https://stackoverflow.com/questions/16179713/converting-float-values-to-a-grayscale-hex-color-value
    // console.log(val)
    const dec = 255 * (1 - val);
    const encoding = ('0' + Number(parseInt(dec, 10)).toString(16)).slice(-2);
    // console.log("#" + encoding.repeat(3))
    return '#' + encoding.repeat(3);
  }

  floatToHSL (val) {
    return 'hsl(' + Math.round(360 * (val % 1)) + ', 100%, 50%)';
  }

  computeNextState () {
    this.setState((prevState) => {
      const newState = prevState.data.map((item, index) => {
        const tempitem = { ...item };

        const neighbors = this.computeNeighbors(index);

        const ctx = {};

        ctx.upleft = neighbors[0];
        ctx.up = neighbors[1];
        ctx.upright = neighbors[2];
        ctx.right = neighbors[3];
        ctx.downright = neighbors[4];
        ctx.down = neighbors[5];
        ctx.downleft = neighbors[6];
        ctx.left = neighbors[7];

        ctx.neighbors = neighbors;
        ctx.board = prevState.data.map(x => x.state);

        // console.log(neighbors)

        ctx.curr = item.state;
        ctx.ones = neighbors.filter(x => x === 1).length;
        ctx.zeroes = neighbors.filter(x => x === 0).length;
        ctx.corners = neighbors.filter((x, i) => { return x === 1 && (i % 2 === 0); }).length;
        ctx.sides = neighbors.filter((x, i) => { return x === 1 && (i % 2 === 1); }).length;

        ctx.index = index;
        ctx.x = item.x;
        ctx.y = item.y;
        ctx.color = tempitem.color;

        ctx.float_to_color = this.floatToHSL;

        ctx.resolution = this.props.edgeLength;

        ctx.t = prevState.time;
        // console.log(this.floatToHSL)

        // return this.props.rule(n)

        ctx.store = item.store;

        // tempitem.state = this.props.rule(n)
        // console.log(this.props.rule(n))

        const value = this.props.rule(ctx);

        // tempitem.store = ctx.store

        // console.log(ctx)

        if (typeof value === 'number' && !isNaN(value)) {
          tempitem.state = value;
        } else {
          // this accounts if they directly set ctx.curr
          tempitem.state = ctx.curr;
        }

        if (typeof value === 'boolean') {
          tempitem.state = value ? 1 : 0;
        }

        if (ctx.color !== '') {
          tempitem.color = ctx.color;
        } else {
          tempitem.color = '';
        }

        if (ctx.animate === true) {
          tempitem.animate = true;
        } else {
          tempitem.animate = false;
        }

        if (ctx.invert === true) {
          tempitem.invert = true;
        } else {
          tempitem.invert = false;
        }

        // //substitute rule here

        // if(neighbors.filter(x => x==1).length  === 0){
        // tempitem.state =  1 - tempitem.state
        // }
        // else{
        // tempitem.state =  tempitem.state
        // }

        return tempitem;
      });

      return { data: newState, time: prevState.time + 1 };
    });
  }

  flipItem (d) {
    this.setState((prevState) => {
      const newState = prevState.data.map((item, index) => {
        if (index === d.index) {
          const tempitem = { ...item };

          if (tempitem.state < 0.5) {
            tempitem.state = 1;
          } else {
            tempitem.state = 0;
          }

          // tempitem.state = 1 - tempitem.state;
          // console.log(tempitem)
          return tempitem;
        } else {
          return item;
        }
      });

      return { data: newState };
    });
    this.updateVisDiscreteFlip();
  }

  drawChart () {
    // get data right away so we dont have to worry about async issues

    this.data = this.setup();
    // console.log(this.edgeLength)
    // console.log("hi")
    this.svg = d3.select('#' + this.props.id)
      .attr('width', this.size)
      .attr('height', this.size);
    // .attr("width", this.size + this.margin.left + this.margin.right)
    // .attr("height", this.size + this.margin.top + this.margin.bottom)

    // console.log(this.svg.select('g').remove());

    this.svg.selectAll('g').remove();
    this.svg.selectAll('rect').remove();

    this.viscontainer = this.svg.append('g');
    // console.log(this.viscontainer);
    // console.log(this.state.data)

    const outerthis = this;

    // console.log(this.state.data.length)

    // background color
    this.viscontainer
      .append('g')
      .selectAll('.background-rect')
      .data(this.data)
      .enter()
      .append('rect')
      .attr('class', 'background-rect')
      .attr('fill', (d, i) => { return 'white'; })
      .attr('stroke-width', 2)
      .attr('stroke', 'black')
      .attr('x', (d, i) => this.xScale(d.x))
      .attr('y', (d, i) => this.yScale(d.y))
      .attr('rx', (d, i) => this.squareLength * 0.2)
      .attr('ry', (d, i) => this.squareLength * 0.2)
      .attr('width', this.squareLength)
      .attr('height', this.squareLength);

    this.viscontainer
      .append('g')
      .selectAll('.main-rect')
      .data(this.data)
      .enter()
      .append('rect')
      .attr('class', 'main-rect')
      .attr('id', (d, i) => d.index)
    // .attr("fill", (d,i) => {return d.state ? "black" : "white"})
      .attr('fill', (d, i) => { return d.color === '' ? 'black' : d.color; })
      .attr('fill-opacity', (d, i) => { return d.state; })
      .attr('stroke-width', 2)
      .attr('stroke', 'black')
      .attr('x', (d, i) => this.xScale(d.x))
      .attr('y', (d, i) => this.yScale(d.y))
      .attr('rx', (d, i) => this.squareLength * 0.2)
      .attr('ry', (d, i) => this.squareLength * 0.2)
      .attr('width', this.squareLength)
      .attr('height', this.squareLength);

    if (!this.props.isMobile) {
      this.viscontainer.selectAll('.main-rect')
        .on('mousedown', (e, d) => {
          // console.log(e)
          // console.log(d)
          outerthis.isDown = true;

          outerthis.flipItem(d);
        })
        .on('mouseup', (e, d) => {
          outerthis.isDown = false;
        })
        .on('mouseover', (e, d) => {
          if (outerthis.isDown) {
            outerthis.flipItem(d);
          }
        });
    } else {
      this.viscontainer.selectAll('.main-rect')
        .on('touchstart', (e, d) => {
          // console.log(e)
          // console.log(d)
          outerthis.isDown = true;

          outerthis.flipItem(d);
        })
        .on('touchend', (e, d) => {
          outerthis.isDown = false;
        });
      // figure out how to do touchmove and still flip the other tiles
    }

    // avoids when you click down on vis but move mouse out
    d3.select('body')
      .on('mouseup', (e, d) => {
        outerthis.isDown = false;
      });

    // this.refresh();
    this.setState({ ready: true });
  }

  componentDidMount () {
    this.drawChart();
  }

  refresh () {
    if (this.props.play && this.state.ready) {
      this.addGifItem();
      this.computeNextState();
      this.updateVis();
    }

    setTimeout(this.refresh, this.props.refreshRate);
  }

  componentDidUpdate (prevProps) {
    if (this.props.edgeLength !== prevProps.edgeLength) {
      this.drawChart();
    }

    if (this.props.play !== prevProps.play && this.props.play) {
      // we just switched the button on
      // console.log(this.state.data)
      const toExport = {};
      for (let i = 0; i < this.state.data.length; i++) {
        if (this.state.data[i].state !== 0) {
          toExport[i] = this.state.data[i].state.toFixed(2);
        }
      }

      this.props.setExportInitData(JSON.stringify(toExport));

      this.gif = new GIF({
	    workers: 3,
	    quality: 1,
	    repeat: 0,
	    workerScript: process.env.PUBLIC_URL + '/gif.worker.js',
	    debug: true
	  });

      this.state.existingBlobs.map((item) => {
        // console.log("yo");
        // console.log(item)
        URL.revokeObjectURL(item);
      });

      this.setState({
        existingBlobs: [],
        time: 0
      });

      this.props.setGifURL('');
    }

    if (this.props.play !== prevProps.play && !this.props.play) {
      if (this.gif.frames.length > 0) {
        this.gif.render();

        const outerthis = this;

        this.gif.on('finished', function (blob) {
          const gifURL = (URL.createObjectURL(blob, { type: 'image/gif' }));

          outerthis.setState((prevState) => {
			    return { existingBlobs: prevState.existingBlobs.concat(gifURL) };
          });

		    outerthis.props.setGifURL(gifURL);
        });
      }
      // console.log(this.gif)
    }

    // }
  }

  addGifItem () {
    if (this.state.existingBlobs.length > 50) {
      // we dont want the gif to keep growing in size, so stop if it gets too big
      return;
    }

    // https://gist.github.com/veltman/1071413ad6b5b542a1a3
    const img = new Image();
    const serialized = new XMLSerializer().serializeToString(this.svg.node());
    const svg = new Blob([serialized], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svg);

    this.setState((prevState) => {
      return { existingBlobs: prevState.existingBlobs.concat(url) };
	    });

    const outerthis = this;
    // Onload, callback to move on to next frame
    img.onload = function () {
    	outerthis.gif.addFrame(img, {
        delay: outerthis.props.refreshRate,
		    copy: true
      });
    };

    img.src = url;
  }

  render () {
    return (
			<svg id={this.props.id} key={this.props.edgeLength}>
			</svg>
    );
  }
}

export default Visualization;