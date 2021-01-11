//This file contains strictly data structures and methods only
//For UI handlers see main.js

'use strict'
//ROS message class
class Point{
	x=0;y=0;z=0;
	constructor(x=0, y=0, z=0) {
		this.x = x;
		this.y = y;
		this.z = z;
	}
	
	static toRvizPoint(point){
		let rvizPoint = new Point();
		rvizPoint.x = point.x * resolution + origin_offset;
		rvizPoint.y = (canvas.height - point.y) * resolution + origin_offset;
		return rvizPoint;
	}
}
class Quartenion{
	x=0;y=0;z=0;w=0;
	constructor(x=0, y=0, z=0, w=1) {
		this.x = x;
		this.y = y;
		this.z = z;
		this.w = w;
	}
}
class Pose{
	position=new Point();
	orientation=new Quartenion();
	constructor(position=new Point(), orientation=new Quartenion()) {
		this.position = position;
		this.orientation = orientation;
	}
}

//default waypoints are saved in canvas coordinates
class Waypoints{
	waypoints = [];
	radius = 5;
	constructor(waypoints=[]) {
		this.waypoints = waypoints;
	}
	push(pose){
		this.waypoints.push(pose);
	}
	exportToRvizWaypoints(){
		let rvizWaypoints = [];
		for (let i=0;i<this.waypoints.length;i++){
			let pose = new Pose();
			pose.position = Point.toRvizPoint(this.waypoints[i].position);
			pose.orientation = this.waypoints[i].orientation;
			rvizWaypoints[i] = pose;
		}
		return rvizWaypoints;
	}
	draw(){
		//draw path
		ctx.fillStyle = "#000000";
		ctx.beginPath();
		for (let i=0;i<this.waypoints.length;i++){
			ctx.lineTo(this.waypoints[i].position.x,this.waypoints[i].position.y);
		}
		ctx.stroke();
		
		//draw points
		ctx.beginPath();
		for (let i=0;i<this.waypoints.length;i++){
			//arc(x, y, radius, startAngle, endAngle, anticlockwise)
			ctx.moveTo(this.waypoints[i].position.x+this.radius, this.waypoints[i].position.y)
			ctx.arc(this.waypoints[i].position.x,
				this.waypoints[i].position.y,
				this.radius, 0, Math.PI * 2, true);
		}
		ctx.fill();
		
		//draw text
		ctx.font = "8px serif";
		ctx.fillStyle = "#FFFFFF";
		for (let i=0;i<this.waypoints.length;i++){
			ctx.fillText(i, this.waypoints[i].position.x-4, this.waypoints[i].position.y+3);
		}
	}
}